-- Comprehensive Lead Cleanup: Remove Invalid and Duplicate Leads (Fixed)

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

-- Step 2: Remove duplicate leads (keep oldest, merge conversations)
WITH duplicate_groups AS (
  SELECT 
    first_name, 
    last_name, 
    email,
    MIN(created_at) as oldest_created_at,
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
leads_to_keep AS (
  SELECT l.id as keep_id
  FROM leads l
  INNER JOIN duplicate_groups dg ON 
    l.first_name = dg.first_name 
    AND l.last_name = dg.last_name 
    AND l.email = dg.email
    AND l.created_at = dg.oldest_created_at
),
leads_to_remove AS (
  SELECT l.id as remove_id, ltk.keep_id
  FROM leads l
  INNER JOIN duplicate_groups dg ON 
    l.first_name = dg.first_name 
    AND l.last_name = dg.last_name 
    AND l.email = dg.email
  LEFT JOIN leads_to_keep ltk ON ltk.keep_id = l.id
  WHERE ltk.keep_id IS NULL
    AND l.status != 'lost'
    AND l.is_hidden != true
)
-- Move conversations from duplicate leads to the lead we're keeping
UPDATE conversations 
SET lead_id = (
  SELECT keep_id 
  FROM leads_to_remove 
  WHERE remove_id = conversations.lead_id
)
WHERE lead_id IN (SELECT remove_id FROM leads_to_remove);

-- Step 3: Delete phone numbers for leads we're about to remove
DELETE FROM phone_numbers 
WHERE lead_id IN (
  WITH duplicate_groups AS (
    SELECT 
      first_name, 
      last_name, 
      email,
      MIN(created_at) as oldest_created_at,
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
  leads_to_keep AS (
    SELECT l.id as keep_id
    FROM leads l
    INNER JOIN duplicate_groups dg ON 
      l.first_name = dg.first_name 
      AND l.last_name = dg.last_name 
      AND l.email = dg.email
      AND l.created_at = dg.oldest_created_at
  )
  SELECT l.id
  FROM leads l
  INNER JOIN duplicate_groups dg ON 
    l.first_name = dg.first_name 
    AND l.last_name = dg.last_name 
    AND l.email = dg.email
  LEFT JOIN leads_to_keep ltk ON ltk.keep_id = l.id
  WHERE ltk.keep_id IS NULL
    AND l.status != 'lost'
    AND l.is_hidden != true
);

-- Step 4: Delete duplicate leads (keep oldest)
DELETE FROM leads 
WHERE id IN (
  WITH duplicate_groups AS (
    SELECT 
      first_name, 
      last_name, 
      email,
      MIN(created_at) as oldest_created_at,
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
  leads_to_keep AS (
    SELECT l.id as keep_id
    FROM leads l
    INNER JOIN duplicate_groups dg ON 
      l.first_name = dg.first_name 
      AND l.last_name = dg.last_name 
      AND l.email = dg.email
      AND l.created_at = dg.oldest_created_at
  )
  SELECT l.id
  FROM leads l
  INNER JOIN duplicate_groups dg ON 
    l.first_name = dg.first_name 
    AND l.last_name = dg.last_name 
    AND l.email = dg.email
  LEFT JOIN leads_to_keep ltk ON ltk.keep_id = l.id
  WHERE ltk.keep_id IS NULL
    AND l.status != 'lost'
    AND l.is_hidden != true
);

-- Step 5: Clean up remaining data quality issues
UPDATE leads 
SET vehicle_interest = 'finding the right vehicle for your needs'
WHERE vehicle_interest IS NULL 
   OR vehicle_interest = ''
   OR vehicle_interest ILIKE '%unknown%'
   OR vehicle_interest ILIKE '%not specified%'
   OR vehicle_interest ILIKE '%n/a%'
   OR vehicle_interest ILIKE '%null%'
   OR vehicle_interest ILIKE '%undefined%';

-- Step 6: Mark leads without valid phone numbers as lost
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