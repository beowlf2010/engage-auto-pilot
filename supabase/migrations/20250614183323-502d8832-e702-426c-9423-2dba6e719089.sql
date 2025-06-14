
-- Clean quotes from leads table
UPDATE public.leads 
SET 
  first_name = TRIM(BOTH '"' FROM first_name),
  last_name = TRIM(BOTH '"' FROM last_name),
  middle_name = CASE 
    WHEN middle_name IS NOT NULL THEN TRIM(BOTH '"' FROM middle_name)
    ELSE middle_name
  END,
  email = CASE 
    WHEN email IS NOT NULL THEN TRIM(BOTH '"' FROM email)
    ELSE email
  END,
  email_alt = CASE 
    WHEN email_alt IS NOT NULL THEN TRIM(BOTH '"' FROM email_alt)
    ELSE email_alt
  END,
  address = CASE 
    WHEN address IS NOT NULL THEN TRIM(BOTH '"' FROM address)
    ELSE address
  END,
  city = CASE 
    WHEN city IS NOT NULL THEN TRIM(BOTH '"' FROM city)
    ELSE city
  END,
  state = CASE 
    WHEN state IS NOT NULL THEN TRIM(BOTH '"' FROM state)
    ELSE state
  END,
  postal_code = CASE 
    WHEN postal_code IS NOT NULL THEN TRIM(BOTH '"' FROM postal_code)
    ELSE postal_code
  END,
  vehicle_interest = TRIM(BOTH '"' FROM vehicle_interest),
  vehicle_year = CASE 
    WHEN vehicle_year IS NOT NULL THEN TRIM(BOTH '"' FROM vehicle_year)
    ELSE vehicle_year
  END,
  vehicle_make = CASE 
    WHEN vehicle_make IS NOT NULL THEN TRIM(BOTH '"' FROM vehicle_make)
    ELSE vehicle_make
  END,
  vehicle_model = CASE 
    WHEN vehicle_model IS NOT NULL THEN TRIM(BOTH '"' FROM vehicle_model)
    ELSE vehicle_model
  END,
  vehicle_vin = CASE 
    WHEN vehicle_vin IS NOT NULL THEN TRIM(BOTH '"' FROM vehicle_vin)
    ELSE vehicle_vin
  END,
  source = TRIM(BOTH '"' FROM source),
  trade_in_vehicle = CASE 
    WHEN trade_in_vehicle IS NOT NULL THEN TRIM(BOTH '"' FROM trade_in_vehicle)
    ELSE trade_in_vehicle
  END,
  updated_at = now()
WHERE 
  first_name LIKE '"%"' OR 
  last_name LIKE '"%"' OR 
  email LIKE '"%"' OR 
  vehicle_interest LIKE '"%"' OR 
  source LIKE '"%"';

-- Clean quotes from phone_numbers table (removed updated_at reference)
UPDATE public.phone_numbers 
SET 
  number = TRIM(BOTH '"' FROM number),
  type = TRIM(BOTH '"' FROM type)
WHERE 
  number LIKE '"%"' OR 
  type LIKE '"%"';

-- Clean quotes from conversations table (check if updated_at exists)
UPDATE public.conversations 
SET 
  body = TRIM(BOTH '"' FROM body)
WHERE 
  body LIKE '"%"';
