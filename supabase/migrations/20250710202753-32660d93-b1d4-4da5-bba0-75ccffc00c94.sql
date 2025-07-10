-- Enhanced duplicate handling and inventory management
CREATE OR REPLACE FUNCTION insert_inventory_with_duplicate_handling(
  p_vehicles jsonb,
  p_upload_history_id uuid,
  p_user_id uuid,
  p_handle_duplicates text DEFAULT 'skip' -- 'skip', 'update', 'replace'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  vehicle_record jsonb;
  inserted_count integer := 0;
  updated_count integer := 0;
  skipped_count integer := 0;
  error_count integer := 0;
  duplicate_count integer := 0;
  errors jsonb := '[]'::jsonb;
  duplicates jsonb := '[]'::jsonb;
  existing_vehicle_id uuid;
  result jsonb;
  current_vin text;
  current_stock text;
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
      'updated_count', 0,
      'skipped_count', 0,
      'duplicate_count', 0,
      'error_count', 1
    );
  END IF;

  -- Process each vehicle with enhanced duplicate detection
  FOR vehicle_record IN SELECT * FROM jsonb_array_elements(p_vehicles)
  LOOP
    BEGIN
      current_vin := vehicle_record->>'vin';
      current_stock := vehicle_record->>'stock_number';
      existing_vehicle_id := NULL;
      
      -- Check for existing vehicle by VIN (primary) or stock number (secondary)
      IF current_vin IS NOT NULL AND length(trim(current_vin)) > 0 THEN
        SELECT id INTO existing_vehicle_id 
        FROM inventory 
        WHERE vin = current_vin 
        LIMIT 1;
      END IF;
      
      -- If no VIN match, try stock number
      IF existing_vehicle_id IS NULL AND current_stock IS NOT NULL AND length(trim(current_stock)) > 0 THEN
        SELECT id INTO existing_vehicle_id 
        FROM inventory 
        WHERE stock_number = current_stock 
        LIMIT 1;
      END IF;
      
      -- Handle duplicate based on strategy
      IF existing_vehicle_id IS NOT NULL THEN
        duplicate_count := duplicate_count + 1;
        
        -- Record duplicate details
        duplicates := duplicates || jsonb_build_object(
          'vin', current_vin,
          'stock_number', current_stock,
          'existing_id', existing_vehicle_id,
          'action', p_handle_duplicates,
          'vehicle_data', vehicle_record
        );
        
        IF p_handle_duplicates = 'skip' THEN
          skipped_count := skipped_count + 1;
          CONTINUE;
        ELSIF p_handle_duplicates = 'update' THEN
          -- Update existing vehicle with new data
          UPDATE inventory SET
            make = COALESCE(vehicle_record->>'make', make),
            model = COALESCE(vehicle_record->>'model', model),
            year = COALESCE((vehicle_record->>'year')::integer, year),
            condition = COALESCE(vehicle_record->>'condition', condition),
            status = COALESCE(vehicle_record->>'status', status),
            price = COALESCE((vehicle_record->>'price')::numeric, price),
            mileage = COALESCE((vehicle_record->>'mileage')::integer, mileage),
            body_style = COALESCE(vehicle_record->>'body_style', body_style),
            color_exterior = COALESCE(vehicle_record->>'color_exterior', color_exterior),
            color_interior = COALESCE(vehicle_record->>'color_interior', color_interior),
            transmission = COALESCE(vehicle_record->>'transmission', transmission),
            engine = COALESCE(vehicle_record->>'engine', engine),
            fuel_type = COALESCE(vehicle_record->>'fuel_type', fuel_type),
            drivetrain = COALESCE(vehicle_record->>'drivetrain', drivetrain),
            trim = COALESCE(vehicle_record->>'trim', trim),
            msrp = COALESCE((vehicle_record->>'msrp')::numeric, msrp),
            invoice = COALESCE((vehicle_record->>'invoice')::numeric, invoice),
            days_in_inventory = COALESCE((vehicle_record->>'days_in_inventory')::integer, days_in_inventory),
            lot_location = COALESCE(vehicle_record->>'lot_location', lot_location),
            dealer_notes = COALESCE(vehicle_record->>'dealer_notes', dealer_notes),
            description = COALESCE(vehicle_record->>'description', description),
            source_report = COALESCE(vehicle_record->>'source_report', 'uploaded')::source_report_type,
            gm_order_number = COALESCE(vehicle_record->>'gm_order_number', gm_order_number),
            customer_name = COALESCE(vehicle_record->>'customer_name', customer_name),
            estimated_delivery_date = CASE 
              WHEN vehicle_record->>'estimated_delivery_date' IS NOT NULL 
              THEN (vehicle_record->>'estimated_delivery_date')::date 
              ELSE estimated_delivery_date 
            END,
            actual_delivery_date = CASE 
              WHEN vehicle_record->>'actual_delivery_date' IS NOT NULL 
              THEN (vehicle_record->>'actual_delivery_date')::date 
              ELSE actual_delivery_date 
            END,
            gm_status_description = COALESCE(vehicle_record->>'gm_status_description', gm_status_description),
            delivery_variance_days = COALESCE((vehicle_record->>'delivery_variance_days')::integer, delivery_variance_days),
            upload_history_id = p_upload_history_id,
            updated_at = now(),
            uploaded_by = p_user_id
          WHERE id = existing_vehicle_id;
          
          updated_count := updated_count + 1;
          CONTINUE;
        ELSIF p_handle_duplicates = 'replace' THEN
          -- Delete existing and insert new
          DELETE FROM inventory WHERE id = existing_vehicle_id;
          -- Continue to insert below
        END IF;
      END IF;
      
      -- Insert new vehicle (either no duplicate found or replace strategy)
      INSERT INTO inventory (
        make, model, year, vin, stock_number, condition, status,
        price, mileage, body_style, color_exterior, color_interior,
        transmission, engine, fuel_type, drivetrain, trim,
        msrp, invoice, days_in_inventory, lot_location,
        dealer_notes, rpo_codes, description,
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
        vehicle_record->>'dealer_notes',
        CASE 
          WHEN vehicle_record->'rpo_codes' IS NOT NULL 
          THEN (SELECT array_agg(value::text) FROM jsonb_array_elements_text(vehicle_record->'rpo_codes'))
          ELSE NULL 
        END,
        vehicle_record->>'description',
        COALESCE(vehicle_record->>'source_report', 'uploaded')::source_report_type,
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
        'vin', current_vin,
        'stock_number', current_stock,
        'vehicle_index', inserted_count + updated_count + skipped_count + error_count
      );
    END;
  END LOOP;

  -- Return enhanced results with duplicate information
  RETURN jsonb_build_object(
    'success', (inserted_count + updated_count) > 0,
    'inserted_count', inserted_count,
    'updated_count', updated_count,
    'skipped_count', skipped_count,
    'duplicate_count', duplicate_count,
    'error_count', error_count,
    'errors', errors,
    'duplicates', duplicates,
    'total_processed', inserted_count + updated_count + skipped_count + error_count,
    'strategy_used', p_handle_duplicates
  );
END;
$$;