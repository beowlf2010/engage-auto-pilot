-- Fix final column name mismatches in insert_inventory_with_context function
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
      -- Insert with correct column names matching the actual inventory table schema
      INSERT INTO inventory (
        make, model, year, vin, stock_number, condition, status,
        price, mileage, body_style, color_exterior, color_interior,
        transmission, engine, fuel_type, drivetrain, trim,
        msrp, invoice, days_in_inventory, lot_location,
        notes, rpo_codes, description,
        source_report, gm_order_number, customer_name,
        estimated_delivery_date, actual_delivery_date,
        gm_status_description, delivery_variance_days,
        upload_history_id, created_at, updated_at,
        uploaded_by
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
        vehicle_record->>'color_exterior',
        vehicle_record->>'color_interior',
        vehicle_record->>'transmission',
        vehicle_record->>'engine',
        vehicle_record->>'fuel_type',
        vehicle_record->>'drivetrain',
        vehicle_record->>'trim',
        COALESCE((vehicle_record->>'msrp')::numeric, 0),
        COALESCE((vehicle_record->>'invoice')::numeric, 0),
        COALESCE((vehicle_record->>'days_in_inventory')::integer, 0),
        vehicle_record->>'lot_location',
        vehicle_record->>'notes',
        CASE 
          WHEN vehicle_record->'rpo_codes' IS NOT NULL 
          THEN (SELECT array_agg(value::text) FROM jsonb_array_elements_text(vehicle_record->'rpo_codes'))
          ELSE NULL 
        END,
        vehicle_record->>'description',
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
        p_user_id
      );

      inserted_count := inserted_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      errors := errors || jsonb_build_object(
        'error', SQLERRM,
        'sqlstate', SQLSTATE,
        'vehicle_data', vehicle_record,
        'vehicle_index', inserted_count + error_count,
        'column_issue', 'Final fix: using color_exterior/color_interior instead of exterior_color/interior_color'
      );
    END;
  END LOOP;

  -- Return detailed results
  RETURN jsonb_build_object(
    'success', inserted_count > 0,
    'inserted_count', inserted_count,
    'error_count', error_count,
    'errors', errors,
    'total_processed', inserted_count + error_count
  );
END;
$$;