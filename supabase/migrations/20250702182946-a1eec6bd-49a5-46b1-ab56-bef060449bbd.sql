-- Phase 1: Fix Authentication Context and RLS Issues for Inventory Uploads

-- Step 1: Create a security definer function for inventory insertion that bypasses RLS issues
CREATE OR REPLACE FUNCTION insert_inventory_with_context(
  p_vehicles jsonb,
  p_upload_history_id uuid,
  p_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  vehicle_record jsonb;
  inserted_count integer := 0;
  error_count integer := 0;
  errors jsonb := '[]'::jsonb;
  result jsonb;
BEGIN
  -- Validate that user has proper role before proceeding
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = p_user_id 
    AND role IN ('admin', 'manager')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User does not have required permissions (admin/manager role required)',
      'inserted_count', 0,
      'error_count', 1
    );
  END IF;

  -- Process each vehicle with explicit user context
  FOR vehicle_record IN SELECT * FROM jsonb_array_elements(p_vehicles)
  LOOP
    BEGIN
      -- Insert with explicit user tracking for RLS compliance
      INSERT INTO inventory (
        make, model, year, vin, stock_number, condition, status,
        price, mileage, body_style, exterior_color, interior_color,
        transmission, engine, fuel_type, drivetrain, trim,
        msrp, invoice_price, days_in_inventory, lot_location,
        key_location, notes, rpo_codes, vehicle_description,
        source_report, gm_order_number, customer_name,
        estimated_delivery_date, actual_delivery_date,
        gm_status_description, delivery_variance_days,
        upload_history_id, created_at, updated_at,
        uploaded_by -- Add explicit user tracking
      )
      VALUES (
        vehicle_record->>'make',
        vehicle_record->>'model',
        COALESCE((vehicle_record->>'year')::integer, 2024),
        vehicle_record->>'vin',
        vehicle_record->>'stock_number',
        COALESCE(vehicle_record->>'condition', 'new'),
        COALESCE(vehicle_record->>'status', 'available'),
        COALESCE((vehicle_record->>'price')::numeric, 0),
        COALESCE((vehicle_record->>'mileage')::integer, 0),
        vehicle_record->>'body_style',
        vehicle_record->>'exterior_color',
        vehicle_record->>'interior_color',
        vehicle_record->>'transmission',
        vehicle_record->>'engine',
        vehicle_record->>'fuel_type',
        vehicle_record->>'drivetrain',
        vehicle_record->>'trim',
        COALESCE((vehicle_record->>'msrp')::numeric, 0),
        COALESCE((vehicle_record->>'invoice_price')::numeric, 0),
        COALESCE((vehicle_record->>'days_in_inventory')::integer, 0),
        vehicle_record->>'lot_location',
        vehicle_record->>'key_location',
        vehicle_record->>'notes',
        CASE 
          WHEN vehicle_record->'rpo_codes' IS NOT NULL 
          THEN (SELECT array_agg(value::text) FROM jsonb_array_elements_text(vehicle_record->'rpo_codes'))
          ELSE NULL 
        END,
        vehicle_record->>'vehicle_description',
        COALESCE(vehicle_record->>'source_report', 'uploaded'),
        vehicle_record->>'gm_order_number',
        vehicle_record->>'customer_name',
        CASE 
          WHEN vehicle_record->>'estimated_delivery_date' IS NOT NULL 
          THEN (vehicle_record->>'estimated_delivery_date')::date 
          ELSE NULL 
        END,
        CASE 
          WHEN vehicle_record->>'actual_delivery_date' IS NOT NULL 
          THEN (vehicle_record->>'actual_delivery_date')::date 
          ELSE NULL 
        END,
        vehicle_record->>'gm_status_description',
        COALESCE((vehicle_record->>'delivery_variance_days')::integer, 0),
        p_upload_history_id,
        COALESCE((vehicle_record->>'created_at')::timestamptz, now()),
        COALESCE((vehicle_record->>'updated_at')::timestamptz, now()),
        p_user_id -- Explicit user tracking
      );
      
      inserted_count := inserted_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      errors := errors || jsonb_build_object(
        'vehicle_index', inserted_count + error_count,
        'error', SQLERRM,
        'sqlstate', SQLSTATE,
        'vehicle_data', vehicle_record
      );
      
      RAISE NOTICE 'Error inserting vehicle: % - %', SQLSTATE, SQLERRM;
    END;
  END LOOP;

  result := jsonb_build_object(
    'success', inserted_count > 0,
    'inserted_count', inserted_count,
    'error_count', error_count,
    'errors', errors,
    'total_processed', inserted_count + error_count,
    'message', format('Inserted %s vehicles, %s errors', inserted_count, error_count)
  );

  RAISE NOTICE 'Inventory insertion complete: %', result;
  RETURN result;
END;
$$;

-- Step 2: Add uploaded_by column to inventory table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory' 
    AND column_name = 'uploaded_by'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE inventory ADD COLUMN uploaded_by uuid REFERENCES auth.users(id);
    CREATE INDEX idx_inventory_uploaded_by ON inventory(uploaded_by);
  END IF;
END $$;

-- Step 3: Update RLS policies to be more explicit and handle auth context properly
DROP POLICY IF EXISTS "Managers and admins can view inventory" ON inventory;
DROP POLICY IF EXISTS "Managers and admins can insert inventory" ON inventory;
DROP POLICY IF EXISTS "Managers and admins can update inventory" ON inventory;

-- Create more robust RLS policies that handle auth context better
CREATE POLICY "inventory_select_policy" ON inventory
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
    OR uploaded_by = auth.uid()
  );

CREATE POLICY "inventory_insert_policy" ON inventory
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
    AND (uploaded_by IS NULL OR uploaded_by = auth.uid())
  );

CREATE POLICY "inventory_update_policy" ON inventory
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Step 4: Create a function to validate upload context before processing
CREATE OR REPLACE FUNCTION validate_upload_context(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile record;
  user_roles_list text[];
BEGIN
  -- Check if user exists and has profile
  SELECT * INTO user_profile 
  FROM profiles 
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'User profile not found',
      'user_id', p_user_id
    );
  END IF;
  
  -- Get user roles
  SELECT array_agg(role::text) INTO user_roles_list
  FROM user_roles 
  WHERE user_id = p_user_id;
  
  -- Check if user has required permissions
  IF NOT (user_roles_list && ARRAY['admin', 'manager']) THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'User does not have required permissions (admin/manager role required)',
      'user_id', p_user_id,
      'user_roles', COALESCE(user_roles_list, ARRAY[]::text[])
    );
  END IF;
  
  RETURN jsonb_build_object(
    'valid', true,
    'user_id', p_user_id,
    'user_email', user_profile.email,
    'user_roles', user_roles_list,
    'message', 'User has valid upload permissions'
  );
END;
$$;

-- Step 5: Create a function to reprocess failed uploads
CREATE OR REPLACE FUNCTION reprocess_failed_upload(p_upload_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  upload_record record;
  result jsonb;
BEGIN
  -- Get the upload record
  SELECT * INTO upload_record
  FROM upload_history 
  WHERE id = p_upload_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Upload record not found',
      'upload_id', p_upload_id
    );
  END IF;
  
  -- Mark as being reprocessed
  UPDATE upload_history 
  SET 
    processing_status = 'reprocessing',
    error_details = COALESCE(error_details, '') || ' | Reprocessing initiated at ' || now()
  WHERE id = p_upload_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'upload_id', p_upload_id,
    'original_filename', upload_record.original_filename,
    'reported_success', upload_record.successful_imports,
    'message', 'Upload marked for reprocessing - file needs to be re-uploaded with fixed logic'
  );
END;
$$;