-- Function to merge duplicate leads and clean up the database
CREATE OR REPLACE FUNCTION public.merge_duplicate_leads_by_phone()
RETURNS TABLE(phone_number text, kept_lead_id uuid, merged_lead_ids uuid[], conversations_moved integer)
LANGUAGE plpgsql
AS $function$
DECLARE
    phone_rec RECORD;
    lead_rec RECORD;
    primary_lead_id uuid;
    conversation_count integer;
BEGIN
    -- Loop through phone numbers that have multiple leads
    FOR phone_rec IN 
        SELECT pn.number
        FROM public.phone_numbers pn 
        JOIN public.leads l ON l.id = pn.lead_id
        GROUP BY pn.number
        HAVING COUNT(DISTINCT l.id) > 1
    LOOP
        -- Find the primary lead (oldest one) for this phone number
        SELECT l.id INTO primary_lead_id
        FROM public.leads l
        JOIN public.phone_numbers pn ON pn.lead_id = l.id
        WHERE pn.number = phone_rec.number
        ORDER BY l.created_at
        LIMIT 1;
        
        -- Count conversations that will be moved
        SELECT COUNT(*) INTO conversation_count
        FROM public.conversations c
        JOIN public.phone_numbers pn ON pn.lead_id = c.lead_id
        WHERE pn.number = phone_rec.number
          AND c.lead_id != primary_lead_id;
        
        -- Move all conversations from duplicate leads to the primary lead
        UPDATE public.conversations 
        SET lead_id = primary_lead_id
        WHERE lead_id IN (
            SELECT DISTINCT l.id
            FROM public.leads l
            JOIN public.phone_numbers pn ON pn.lead_id = l.id
            WHERE pn.number = phone_rec.number
              AND l.id != primary_lead_id
        );
        
        -- Collect IDs of leads that will be merged
        RETURN QUERY
        SELECT 
            phone_rec.number::text,
            primary_lead_id,
            ARRAY(
                SELECT l.id
                FROM public.leads l
                JOIN public.phone_numbers pn ON pn.lead_id = l.id
                WHERE pn.number = phone_rec.number
                  AND l.id != primary_lead_id
            ),
            conversation_count;
        
        -- Delete duplicate phone number records
        DELETE FROM public.phone_numbers 
        WHERE number = phone_rec.number 
          AND lead_id != primary_lead_id;
        
        -- Delete duplicate lead records
        DELETE FROM public.leads 
        WHERE id IN (
            SELECT l.id
            FROM public.leads l
            LEFT JOIN public.phone_numbers pn ON pn.lead_id = l.id
            WHERE pn.lead_id IS NULL  -- No phone numbers left
        );
        
    END LOOP;
    
    RETURN;
END;
$function$;

-- Function to add unique constraint to prevent future duplicates
CREATE OR REPLACE FUNCTION public.add_phone_number_constraints()
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Add unique constraint to prevent duplicate phone numbers
    -- This will prevent the same phone number from being added to multiple leads
    ALTER TABLE public.phone_numbers 
    DROP CONSTRAINT IF EXISTS unique_phone_number;
    
    ALTER TABLE public.phone_numbers 
    ADD CONSTRAINT unique_phone_number UNIQUE (number);
    
EXCEPTION WHEN OTHERS THEN
    -- If constraint already exists or other error, log it
    RAISE NOTICE 'Phone number constraint already exists or error occurred: %', SQLERRM;
END;
$function$;