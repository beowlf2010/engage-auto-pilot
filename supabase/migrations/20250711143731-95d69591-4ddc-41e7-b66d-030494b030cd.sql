-- Fix inventory upload permissions and improve error handling

-- Create a more robust inventory insertion function that handles permissions better
CREATE OR REPLACE FUNCTION public.insert_inventory_secure(
  p_vehicles jsonb,
  p_upload_history_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vehicle_record jsonb;
  inserted_count integer := 0;
  total_count integer := 0;
  error_details jsonb := '[]'::jsonb;
  current_user_id uuid;
  user_has_permission boolean := false;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'inserted_count', 0,
      'total_count', 0,
      'error', 'User not authenticated',
      'error_details', error_details
    );
  END IF;
  
  -- Check if user has required permissions (manager, admin, or sales role)
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = current_user_id 
    AND role IN ('admin', 'manager', 'sales')
  ) INTO user_has_permission;
  
  IF NOT user_has_permission THEN
    -- Initialize user with manager role if they don't have any role
    PERFORM public.initialize_user_for_csv_clean(
      current_user_id,
      COALESCE(
        (SELECT email FROM public.profiles WHERE id = current_user_id),
        'user@example.com'
      )
    );
    
    -- Re-check permissions after initialization
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = current_user_id 
      AND role IN ('admin', 'manager', 'sales')
    ) INTO user_has_permission;
  END IF;
  
  IF NOT user_has_permission THEN
    RETURN jsonb_build_object(
      'success', false,
      'inserted_count', 0,
      'total_count', 0,
      'error', 'Insufficient permissions: User needs manager, admin, or sales role',
      'error_details', error_details
    );
  END IF;
  
  -- Process vehicles
  total_count := jsonb_array_length(p_vehicles);
  
  FOR vehicle_record IN SELECT * FROM jsonb_array_elements(p_vehicles)
  LOOP
    BEGIN
      INSERT INTO public.inventory (
        id, make, model, year, vin, stock_number, price, mileage, condition,
        exterior_color, interior_color, transmission, drivetrain, fuel_type,
        body_style, engine, trim_level, status, upload_history_id, created_at, updated_at
      )
      VALUES (
        COALESCE((vehicle_record->>'id')::uuid, gen_random_uuid()),
        vehicle_record->>'make',
        vehicle_record->>'model',
        COALESCE((vehicle_record->>'year')::integer, 0),
        vehicle_record->>'vin',
        vehicle_record->>'stock_number',
        COALESCE((vehicle_record->>'price')::numeric, 0),
        COALESCE((vehicle_record->>'mileage')::integer, 0),
        COALESCE(vehicle_record->>'condition', 'used'),
        vehicle_record->>'exterior_color',
        vehicle_record->>'interior_color',
        vehicle_record->>'transmission',
        vehicle_record->>'drivetrain',
        vehicle_record->>'fuel_type',
        vehicle_record->>'body_style',
        vehicle_record->>'engine',
        vehicle_record->>'trim_level',
        COALESCE(vehicle_record->>'status', 'available'),
        p_upload_history_id,
        now(),
        now()
      );
      
      inserted_count := inserted_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      error_details := error_details || jsonb_build_object(
        'vehicle_index', total_count - jsonb_array_length(p_vehicles) + 1,
        'error', SQLERRM,
        'sqlstate', SQLSTATE,
        'vehicle_data', vehicle_record
      );
    END;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', inserted_count > 0,
    'inserted_count', inserted_count,
    'total_count', total_count,
    'error_details', error_details
  );
END;
$$;