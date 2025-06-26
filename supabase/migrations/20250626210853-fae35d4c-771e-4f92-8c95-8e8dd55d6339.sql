
-- Create the complete RLS bypass function for CSV uploads (fixed syntax)
CREATE OR REPLACE FUNCTION public.upload_csv_leads_bypass_rls(
  p_leads jsonb,
  p_upload_history_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  lead_record jsonb;
  inserted_lead_id uuid;
  phone_record jsonb;
  total_processed integer := 0;
  successful_inserts integer := 0;
  errors jsonb := '[]'::jsonb;
  result jsonb;
  name_parts text[];
  salesperson_first text;
  salesperson_last text;
BEGIN
  -- Temporarily disable RLS for this session
  SET row_security = off;
  
  BEGIN
    -- Process each lead
    FOR lead_record IN SELECT * FROM jsonb_array_elements(p_leads)
    LOOP
      total_processed := total_processed + 1;
      
      BEGIN
        -- Parse salesperson name
        IF lead_record->>'salesPersonName' IS NOT NULL THEN
          name_parts := string_to_array(lead_record->>'salesPersonName', ' ');
          salesperson_first := name_parts[1];
          IF array_length(name_parts, 1) > 1 THEN
            salesperson_last := array_to_string(name_parts[2:array_length(name_parts, 1)], ' ');
          ELSE
            salesperson_last := NULL;
          END IF;
        ELSE
          salesperson_first := NULL;
          salesperson_last := NULL;
        END IF;
        
        -- Insert lead directly without any RLS checks
        INSERT INTO public.leads (
          first_name, last_name, middle_name, email, email_alt,
          address, city, state, postal_code, vehicle_interest,
          vehicle_vin, source, status, do_not_call, do_not_email,
          do_not_mail, salesperson_first_name, salesperson_last_name,
          upload_history_id, lead_status_type_name, lead_type_name, lead_source_name
        )
        VALUES (
          lead_record->>'firstName',
          lead_record->>'lastName', 
          lead_record->>'middleName',
          lead_record->>'email',
          lead_record->>'emailAlt',
          lead_record->>'address',
          lead_record->>'city',
          lead_record->>'state',
          lead_record->>'postalCode',
          COALESCE(lead_record->>'vehicleInterest', 'finding the right vehicle for your needs'),
          lead_record->>'vehicleVIN',
          COALESCE(lead_record->>'source', 'CSV Import'),
          COALESCE(lead_record->>'status', 'new'),
          COALESCE((lead_record->>'doNotCall')::boolean, false),
          COALESCE((lead_record->>'doNotEmail')::boolean, false),
          COALESCE((lead_record->>'doNotMail')::boolean, false),
          salesperson_first,
          salesperson_last,
          p_upload_history_id,
          lead_record->>'leadStatusTypeName',
          lead_record->>'leadTypeName',
          lead_record->>'leadSourceName'
        )
        RETURNING id INTO inserted_lead_id;
        
        -- Insert phone numbers if they exist
        IF lead_record->'phoneNumbers' IS NOT NULL THEN
          FOR phone_record IN SELECT * FROM jsonb_array_elements(lead_record->'phoneNumbers')
          LOOP
            INSERT INTO public.phone_numbers (
              lead_id, number, type, priority, status, is_primary
            )
            VALUES (
              inserted_lead_id,
              phone_record->>'number',
              COALESCE(phone_record->>'type', 'mobile'),
              COALESCE((phone_record->>'priority')::integer, 1),
              COALESCE(phone_record->>'status', 'active'),
              COALESCE((phone_record->>'isPrimary')::boolean, false)
            );
          END LOOP;
        END IF;
        
        successful_inserts := successful_inserts + 1;
        
      EXCEPTION WHEN OTHERS THEN
        -- Add error to results
        errors := errors || jsonb_build_object(
          'rowIndex', total_processed,
          'error', SQLERRM,
          'leadData', lead_record
        );
      END;
    END LOOP;
    
  EXCEPTION WHEN OTHERS THEN
    -- Re-enable RLS before returning error
    SET row_security = on;
    RAISE;
  END;
  
  -- Re-enable RLS
  SET row_security = on;
  
  -- Build result
  result := jsonb_build_object(
    'success', true,
    'totalProcessed', total_processed,
    'successfulInserts', successful_inserts,
    'errors', errors,
    'message', format('Processed %s leads, %s successful inserts', total_processed, successful_inserts)
  );
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.upload_csv_leads_bypass_rls(jsonb, uuid) TO authenticated;

-- Create a function to make user admin (to be called from client)
CREATE OR REPLACE FUNCTION public.make_current_user_admin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update existing manager role to admin
  UPDATE public.user_roles 
  SET role = 'admin' 
  WHERE user_id = auth.uid() AND role = 'manager';
  
  -- Insert admin role if it doesn't exist
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN jsonb_build_object('success', true, 'message', 'User promoted to admin');
END;
$$;

GRANT EXECUTE ON FUNCTION public.make_current_user_admin() TO authenticated;
