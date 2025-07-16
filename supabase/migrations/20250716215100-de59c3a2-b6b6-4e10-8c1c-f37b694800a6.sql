-- Comprehensive Lead Cleanup: Remove Invalid and Duplicate Leads (Safe Version)

-- Step 1: Mark business/organization records as lost and hidden
UPDATE leads 
SET status = 'lost', 
    is_hidden = true,
    updated_at = now()
WHERE 
  -- Business/organization names in first_name or last_name
  first_name ILIKE ANY (ARRAY[
    '%commission%', '%tribal%', '%gaming%', '%casino%', '%band%', 
    '%creek%', '%poarch%', '%indians%', '%dealership%', '%motors%',
    '%automotive%', '%ford%', '%chevrolet%', '%gm%', '%government%',
    '%department%', '%agency%', '%bureau%', '%office%', '%city%',
    '%county%', '%state%', '%federal%'
  ])
  OR last_name ILIKE ANY (ARRAY[
    '%commission%', '%tribal%', '%gaming%', '%casino%', '%band%', 
    '%creek%', '%poarch%', '%indians%', '%dealership%', '%motors%',
    '%automotive%', '%ford%', '%chevrolet%', '%gm%', '%government%',
    '%department%', '%agency%', '%bureau%', '%office%', '%city%',
    '%county%', '%state%', '%federal%'
  ])
  -- Government email domains
  OR email ILIKE '%.gov'
  OR email ILIKE '%.mil'
  -- Business email patterns
  OR email ILIKE '%@dealership%'
  OR email ILIKE '%@automotive%'
  OR email ILIKE '%@motors%'
  -- Invalid vehicle interests
  OR vehicle_interest ILIKE '%make unknown%'
  OR vehicle_interest ILIKE '%model unknown%'
  -- Names that are clearly not people
  OR first_name ILIKE 'test%'
  OR last_name ILIKE 'test%'
  OR first_name = 'Unknown'
  OR last_name = 'Unknown'
  OR first_name = ''
  OR last_name = '';

-- Step 2: Clean up remaining data quality issues
UPDATE leads 
SET vehicle_interest = 'finding the right vehicle for your needs'
WHERE vehicle_interest IS NULL 
   OR vehicle_interest = ''
   OR vehicle_interest ILIKE '%unknown%'
   OR vehicle_interest ILIKE '%not specified%'
   OR vehicle_interest ILIKE '%n/a%'
   OR vehicle_interest ILIKE '%null%'
   OR vehicle_interest ILIKE '%undefined%';

-- Step 3: Mark leads without valid phone numbers as lost
UPDATE leads 
SET status = 'lost',
    is_hidden = true,
    updated_at = now()
WHERE NOT EXISTS (
  SELECT 1 FROM phone_numbers 
  WHERE lead_id = leads.id 
  AND status = 'active'
  AND length(regexp_replace(number, '[^0-9]', '', 'g')) >= 10
  AND number !~ '[a-zA-Z]'
)
AND status != 'lost';

-- Step 4: Handle duplicates more carefully
-- First, identify exact duplicates and merge their conversations
WITH duplicate_analysis AS (
  SELECT 
    first_name, 
    last_name, 
    email,
    array_agg(id ORDER BY created_at) as lead_ids,
    COUNT(*) as duplicate_count
  FROM leads 
  WHERE status != 'lost' 
    AND is_hidden != true
    AND email IS NOT NULL 
    AND email != ''
    AND first_name IS NOT NULL 
    AND first_name != ''
    AND last_name IS NOT NULL 
    AND last_name != ''
  GROUP BY first_name, last_name, email
  HAVING COUNT(*) > 1
),
lead_mapping AS (
  SELECT 
    lead_ids[1] as keep_lead_id,
    unnest(lead_ids[2:]) as remove_lead_id
  FROM duplicate_analysis
)
-- Move conversations from duplicates to the lead we're keeping
UPDATE conversations 
SET lead_id = lm.keep_lead_id
FROM lead_mapping lm
WHERE conversations.lead_id = lm.remove_lead_id;

-- Step 5: Delete phone numbers for duplicate leads we're removing
WITH duplicate_analysis AS (
  SELECT 
    first_name, 
    last_name, 
    email,
    array_agg(id ORDER BY created_at) as lead_ids,
    COUNT(*) as duplicate_count
  FROM leads 
  WHERE status != 'lost' 
    AND is_hidden != true
    AND email IS NOT NULL 
    AND email != ''
    AND first_name IS NOT NULL 
    AND first_name != ''
    AND last_name IS NOT NULL 
    AND last_name != ''
  GROUP BY first_name, last_name, email
  HAVING COUNT(*) > 1
),
leads_to_remove AS (
  SELECT unnest(lead_ids[2:]) as remove_lead_id
  FROM duplicate_analysis
)
DELETE FROM phone_numbers 
WHERE lead_id IN (SELECT remove_lead_id FROM leads_to_remove);

-- Step 6: Delete duplicate leads (keep oldest)
WITH duplicate_analysis AS (
  SELECT 
    first_name, 
    last_name, 
    email,
    array_agg(id ORDER BY created_at) as lead_ids,
    COUNT(*) as duplicate_count
  FROM leads 
  WHERE status != 'lost' 
    AND is_hidden != true
    AND email IS NOT NULL 
    AND email != ''
    AND first_name IS NOT NULL 
    AND first_name != ''
    AND last_name IS NOT NULL 
    AND last_name != ''
  GROUP BY first_name, last_name, email
  HAVING COUNT(*) > 1
),
leads_to_remove AS (
  SELECT unnest(lead_ids[2:]) as remove_lead_id
  FROM duplicate_analysis
)
DELETE FROM leads 
WHERE id IN (SELECT remove_lead_id FROM leads_to_remove);