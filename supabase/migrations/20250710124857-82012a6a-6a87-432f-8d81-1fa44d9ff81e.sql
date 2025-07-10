-- Insert realistic automotive leads with various statuses and engagement patterns
INSERT INTO public.leads (
  id, first_name, last_name, email, phone, address, city, state, postal_code,
  vehicle_interest, source, status, lead_temperature, ai_opt_in, last_reply_at,
  message_intensity, ai_strategy_bucket, ai_aggression_level,
  lead_status_type_name, lead_type_name, lead_source_name,
  created_at, updated_at
) VALUES 
-- High-temperature leads that need immediate attention
(
  gen_random_uuid(), 'Michael', 'Johnson', 'michael.johnson@email.com', '555-0101',
  '123 Oak Street', 'Dallas', 'TX', '75201',
  '2024 Chevrolet Silverado 1500 - Crew Cab', 'AutoTrader', 'new', 85,
  true, now() - interval '48 hours',
  'aggressive', 'marketplace', 5,
  'hot_lead', 'finance_ready', 'autotrader',
  now() - interval '3 days', now()
),
(
  gen_random_uuid(), 'Sarah', 'Williams', 'sarah.williams@email.com', '555-0102',
  '456 Elm Drive', 'Plano', 'TX', '75024',
  '2024 GMC Sierra 1500 - Denali Trim', 'Website Form', 'engaged', 78,
  true, now() - interval '6 hours',
  'gentle', 'website_forms', 4,
  'warm_lead', 'cash_buyer', 'dealer_website',
  now() - interval '2 days', now()
),
(
  gen_random_uuid(), 'Robert', 'Davis', 'robert.davis@email.com', '555-0103',
  '789 Pine Avenue', 'Frisco', 'TX', '75034',
  '2024 Chevrolet Tahoe - High Country', 'Cars.com', 'new', 65,
  true, now() - interval '24 hours',
  'gentle', 'marketplace', 4,
  'warm_lead', 'trade_in', 'cars_com',
  now() - interval '5 days', now()
),
(
  gen_random_uuid(), 'Jennifer', 'Brown', 'jennifer.brown@email.com', '555-0104',
  '321 Maple Court', 'McKinney', 'TX', '75070',
  '2024 GMC Acadia - Denali Trim', 'Phone Inquiry', 'contacted', 58,
  false, now() - interval '72 hours',
  'gentle', 'phone_up', 3,
  'warm_lead', 'finance_pending', 'phone_call',
  now() - interval '4 days', now()
),
(
  gen_random_uuid(), 'David', 'Wilson', 'david.wilson@email.com', '555-0105',
  '654 Cedar Lane', 'Allen', 'TX', '75013',
  '2024 Chevrolet Equinox - Premier Trim', 'CarGurus', 'new', 45,
  true, now() - interval '10 days',
  'gentle', 'marketplace', 2,
  'cold_lead', 'browsing', 'cargurus',
  now() - interval '12 days', now()
),
(
  gen_random_uuid(), 'James', 'Garcia', 'james.garcia@email.com', '555-0107',
  '147 Spruce Way', 'Garland', 'TX', '75040',
  '2024 Chevrolet Camaro - SS Trim', 'GM Financial', 'new', 72,
  true, now() - interval '12 hours',
  'aggressive', 'oem_gm_finance', 5,
  'hot_lead', 'finance_approved', 'gm_financial',
  now() - interval '1 day', now()
),
(
  gen_random_uuid(), 'Christopher', 'Lee', 'chris.lee@email.com', '555-0109',
  '369 Dogwood Circle', 'Carrollton', 'TX', '75006',
  '2024 Chevrolet Corvette - Stingray', 'Website Chat', 'contacted', 88,
  true, now() - interval '4 hours',
  'aggressive', 'website_forms', 5,
  'hot_lead', 'luxury_buyer', 'website_chat',
  now() - interval '1 day', now()
);

-- Insert phone numbers for the leads
INSERT INTO public.phone_numbers (
  id, lead_id, number, type, priority, status, is_primary, created_at
)
SELECT 
  gen_random_uuid(),
  l.id,
  l.phone,
  'mobile',
  1,
  'active',
  true,
  l.created_at
FROM public.leads l
WHERE l.phone IS NOT NULL
AND l.created_at > now() - interval '1 hour';

-- Insert conversation history
INSERT INTO public.conversations (
  id, lead_id, direction, body, sent_at, read_at, ai_generated, created_at
)
SELECT 
  gen_random_uuid(),
  l.id,
  'out',
  'Hi ' || l.first_name || '! Thanks for your interest in the ' || split_part(l.vehicle_interest, ' - ', 1) || '. I''d love to help you find exactly what you''re looking for!',
  l.created_at + interval '2 hours',
  CASE WHEN l.last_reply_at IS NOT NULL THEN l.created_at + interval '4 hours' ELSE NULL END,
  true,
  l.created_at + interval '2 hours'
FROM public.leads l
WHERE l.created_at > now() - interval '1 hour';

-- Insert replies for engaged leads
INSERT INTO public.conversations (
  id, lead_id, direction, body, sent_at, read_at, ai_generated, created_at
)
SELECT 
  gen_random_uuid(),
  l.id,
  'in',
  CASE 
    WHEN l.lead_temperature > 70 THEN 'Yes, I''m very interested! When can we meet?'
    WHEN l.lead_temperature > 50 THEN 'Thanks for reaching out. I''d like to know more about pricing.'
    ELSE 'I''m still shopping around, but thanks for the info.'
  END,
  l.last_reply_at,
  l.last_reply_at + interval '30 minutes',
  false,
  l.last_reply_at
FROM public.leads l
WHERE l.last_reply_at IS NOT NULL 
AND l.created_at > now() - interval '1 hour';