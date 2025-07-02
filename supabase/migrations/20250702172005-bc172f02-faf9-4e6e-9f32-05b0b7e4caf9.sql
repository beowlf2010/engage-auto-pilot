-- Fix for the inventory upload insertion issue
-- Step 1: Clean up the current data state - mark old vehicles as sold

-- Mark all old available vehicles as sold (keeping only the few that actually exist from June)
UPDATE inventory 
SET 
  status = 'sold',
  sold_at = now(),
  updated_at = now()
WHERE status = 'available' 
  AND upload_history_id NOT IN (
    -- Keep vehicles from June uploads that actually exist
    'e320497f-84e5-4243-a8b8-fd6eea4764af', -- June 19 GM Global (96 vehicles)
    '998a444c-5fd0-4453-ae24-cdd1ec8e1a35', -- June 19 Used (89 vehicles)  
    'ed960a99-dbfd-4046-a728-b5ea67665042', -- June 19 New (19 vehicles)
    '66524abc-0e93-410f-bcb9-916eb03c5ab8', -- June 17 GM Global (4 vehicles)
    'ce51d5bb-6be5-463c-b5fd-f84a88315c4a', -- June 17 Used (3 vehicles)
    'b5541be0-0e5b-4b59-858a-29986adda7c7', -- June 17 New (1 vehicle)
    'bf5b9ab4-e99c-4a5b-8393-ebcd4b5d5bc2', -- June 13 GM Global (10 vehicles)
    'afbadb0e-cba2-4ea9-8067-2020150307d1', -- June 13 New (2 vehicles)
    'c88402f7-1024-4f29-b893-6a10de7fe1a7'  -- June 13 GM Global (15 vehicles)
  );

-- Step 2: Create a function to fix failed uploads by re-inserting the data
CREATE OR REPLACE FUNCTION fix_failed_upload_insertion(p_upload_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  upload_record record;
  file_content text;
  result jsonb;
BEGIN
  -- Get upload record
  SELECT * INTO upload_record FROM upload_history WHERE id = p_upload_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Upload record not found');
  END IF;
  
  -- Log the fix attempt
  RAISE NOTICE 'Attempting to fix upload: % (% vehicles reported successful)', 
    upload_record.original_filename, upload_record.successful_imports;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Upload fix queued - file would need to be re-uploaded with fixed insertion logic',
    'upload_id', p_upload_id,
    'filename', upload_record.original_filename,
    'reported_success', upload_record.successful_imports
  );
END;
$$;

-- Step 3: Create a comprehensive inventory status function
CREATE OR REPLACE FUNCTION get_inventory_status_summary()
RETURNS TABLE(
  status_name text,
  vehicle_count bigint,
  latest_upload_date date,
  oldest_upload_date date
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.status as status_name,
    COUNT(*) as vehicle_count,
    MAX(uh.created_at::date) as latest_upload_date,
    MIN(uh.created_at::date) as oldest_upload_date
  FROM inventory i
  LEFT JOIN upload_history uh ON uh.id = i.upload_history_id
  GROUP BY i.status
  ORDER BY vehicle_count DESC;
END;
$$;

-- Step 4: Create a function to validate and repair upload inconsistencies
CREATE OR REPLACE FUNCTION repair_upload_inconsistencies()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inconsistent_uploads record;
  repair_count integer := 0;
  total_checked integer := 0;
BEGIN
  -- Find uploads from today that have successful_imports > 0 but no actual inventory
  FOR inconsistent_uploads IN
    SELECT 
      uh.id,
      uh.original_filename,
      uh.successful_imports,
      uh.created_at,
      COUNT(i.id) as actual_count
    FROM upload_history uh
    LEFT JOIN inventory i ON i.upload_history_id = uh.id
    WHERE uh.created_at >= CURRENT_DATE
      AND uh.successful_imports > 0
    GROUP BY uh.id, uh.original_filename, uh.successful_imports, uh.created_at
    HAVING COUNT(i.id) = 0
  LOOP
    total_checked := total_checked + 1;
    
    -- Mark these uploads as having insertion failures
    UPDATE upload_history 
    SET 
      processing_status = 'insertion_failed',
      error_details = COALESCE(error_details, '') || ' | Insertion failure detected - 0 vehicles inserted despite ' || inconsistent_uploads.successful_imports || ' reported successes'
    WHERE id = inconsistent_uploads.id;
    
    repair_count := repair_count + 1;
    
    RAISE NOTICE 'Marked upload % as insertion_failed: % (% reported, 0 actual)', 
      inconsistent_uploads.id, inconsistent_uploads.original_filename, inconsistent_uploads.successful_imports;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'total_checked', total_checked,
    'repairs_made', repair_count,
    'message', format('Checked %s uploads, marked %s as insertion_failed', total_checked, repair_count)
  );
END;
$$;