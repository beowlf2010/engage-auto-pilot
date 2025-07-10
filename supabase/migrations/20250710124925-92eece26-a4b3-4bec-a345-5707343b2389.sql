-- Insert realistic automotive leads with basic required fields only
INSERT INTO public.leads (
  first_name, last_name, email, phone, address, city, state, postal_code,
  vehicle_interest, source, status, lead_temperature, ai_opt_in, last_reply_at,
  created_at, updated_at
) VALUES 
-- High-temperature leads that need immediate attention
(
  'Michael', 'Johnson', 'michael.johnson@email.com', '555-0101',
  '123 Oak Street', 'Dallas', 'TX', '75201',
  '2024 Chevrolet Silverado 1500 - Crew Cab', 'AutoTrader', 'new', 85,
  true, now() - interval '48 hours',
  now() - interval '3 days', now()
),
(
  'Sarah', 'Williams', 'sarah.williams@email.com', '555-0102',
  '456 Elm Drive', 'Plano', 'TX', '75024',
  '2024 GMC Sierra 1500 - Denali Trim', 'Website Form', 'engaged', 78,
  true, now() - interval '6 hours',
  now() - interval '2 days', now()
),
(
  'Robert', 'Davis', 'robert.davis@email.com', '555-0103',
  '789 Pine Avenue', 'Frisco', 'TX', '75034',
  '2024 Chevrolet Tahoe - High Country', 'Cars.com', 'new', 65,
  true, now() - interval '24 hours',
  now() - interval '5 days', now()
),
(
  'James', 'Garcia', 'james.garcia@email.com', '555-0107',
  '147 Spruce Way', 'Garland', 'TX', '75040',
  '2024 Chevrolet Camaro - SS Trim', 'GM Financial', 'new', 72,
  true, now() - interval '12 hours',
  now() - interval '1 day', now()
),
(
  'Christopher', 'Lee', 'chris.lee@email.com', '555-0109',
  '369 Dogwood Circle', 'Carrollton', 'TX', '75006',
  '2024 Chevrolet Corvette - Stingray', 'Website Chat', 'contacted', 88,
  true, now() - interval '4 hours',
  now() - interval '1 day', now()
),
(
  'David', 'Wilson', 'david.wilson@email.com', '555-0105',
  '654 Cedar Lane', 'Allen', 'TX', '75013',
  '2024 Chevrolet Equinox - Premier Trim', 'CarGurus', 'new', 45,
  true, now() - interval '10 days',
  now() - interval '12 days', now()
);