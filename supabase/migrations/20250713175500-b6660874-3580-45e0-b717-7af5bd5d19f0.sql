-- Create a function to get the latest conversation per lead efficiently
CREATE OR REPLACE FUNCTION get_latest_conversations_per_lead()
RETURNS TABLE (
  id uuid,
  lead_id uuid,
  body text,
  direction text,
  sent_at timestamp with time zone,
  read_at timestamp with time zone,
  first_name text,
  last_name text,
  email text,
  vehicle_interest text,
  salesperson_id uuid,
  status text,
  ai_opt_in boolean,
  source text,
  lead_type_name text,
  profiles_first_name text,
  profiles_last_name text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH latest_conversations AS (
    SELECT 
      c.id,
      c.lead_id,
      c.body,
      c.direction,
      c.sent_at,
      c.read_at,
      ROW_NUMBER() OVER (PARTITION BY c.lead_id ORDER BY c.sent_at DESC) as rn
    FROM conversations c
  )
  SELECT 
    lc.id,
    lc.lead_id,
    lc.body,
    lc.direction,
    lc.sent_at,
    lc.read_at,
    l.first_name,
    l.last_name,
    l.email,
    l.vehicle_interest,
    l.salesperson_id,
    l.status,
    l.ai_opt_in,
    l.source,
    l.lead_type_name,
    p.first_name as profiles_first_name,
    p.last_name as profiles_last_name
  FROM latest_conversations lc
  INNER JOIN leads l ON l.id = lc.lead_id
  LEFT JOIN profiles p ON p.id = l.salesperson_id
  WHERE lc.rn = 1
  ORDER BY lc.sent_at DESC;
$$;