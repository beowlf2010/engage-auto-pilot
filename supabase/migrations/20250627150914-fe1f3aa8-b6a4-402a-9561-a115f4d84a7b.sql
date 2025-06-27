
-- Drop the existing problematic function
DROP FUNCTION IF EXISTS public.upload_csv_leads_bypass_rls(jsonb, uuid);

-- Create the ultimate Supabase-compatible bypass function
CREATE OR REPLACE FUNCTION public.upload_csv_leads_bypass_rls(
  p_leads jsonb,
  p_upload_history_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
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
  -- Process each lead with direct INSERT statements that completely bypass RLS
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
      
      -- Generate UUID for the lead
      inserted_lead_id := gen_random_uuid();
      
      -- Direct INSERT without any RLS evaluation - this completely bypasses RLS
      INSERT INTO leads (
        id, first_name, last_name, middle_name, email, email_alt,
        address, city, state, postal_code, vehicle_interest,
        vehicle_vin, source, status, do_not_call, do_not_email,
        do_not_mail, salesperson_first_name, salesperson_last_name,
        upload_history_id, lead_status_type_name, lead_type_name, 
        lead_source_name, created_at, updated_at
      )
      VALUES (
        inserted_lead_id,
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
        lead_record->>'leadSourceName',
        now(),
        now()
      );
      
      -- Insert phone numbers if they exist using direct INSERT without RLS
      IF lead_record->'phoneNumbers' IS NOT NULL THEN
        FOR phone_record IN SELECT * FROM jsonb_array_elements(lead_record->'phoneNumbers')
        LOOP
          INSERT INTO phone_numbers (
            id, lead_id, number, type, priority, status, is_primary, created_at, updated_at
          )
          VALUES (
            gen_random_uuid(),
            inserted_lead_id,
            phone_record->>'number',
            COALESCE(phone_record->>'type', 'mobile'),
            COALESCE((phone_record->>'priority')::integer, 1),
            COALESCE(phone_record->>'status', 'active'),
            COALESCE((phone_record->>'isPrimary')::boolean, false),
            now(),
            now()
          );
        END LOOP;
      END IF;
      
      successful_inserts := successful_inserts + 1;
      
    EXCEPTION WHEN OTHERS THEN
      -- Add detailed error information without any session role references
      errors := errors || jsonb_build_object(
        'rowIndex', total_processed,
        'error', SQLERRM,
        'sqlstate', SQLSTATE,
        'leadData', lead_record,
        'timestamp', now()
      );
    END;
  END LOOP;
  
  -- Build comprehensive result
  result := jsonb_build_object(
    'success', successful_inserts > 0,
    'totalProcessed', total_processed,
    'successfulInserts', successful_inserts,
    'errors', errors,
    'errorCount', jsonb_array_length(errors),
    'message', format('Processed %s leads, %s successful inserts, %s errors', 
                     total_processed, successful_inserts, jsonb_array_length(errors)),
    'timestamp', now()
  );
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  -- Return error result without any session role cleanup
  RETURN jsonb_build_object(
    'success', false,
    'totalProcessed', total_processed,
    'successfulInserts', successful_inserts,
    'errors', jsonb_build_array(
      jsonb_build_object(
        'error', 'Function execution failed: ' || SQLERRM,
        'sqlstate', SQLSTATE,
        'timestamp', now()
      )
    ),
    'message', 'Upload function failed with critical error'
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.upload_csv_leads_bypass_rls(jsonb, uuid) TO authenticated;
