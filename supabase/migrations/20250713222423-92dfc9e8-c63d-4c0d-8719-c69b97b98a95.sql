-- PRIORITY 2: Fix Smart Inbox to show inbound messages properly
-- The current get_latest_conversations_per_lead only shows the latest message per lead,
-- but we need to prioritize showing leads that have unread inbound messages

-- Create a better function that prioritizes inbound messages for Smart Inbox
CREATE OR REPLACE FUNCTION public.get_inbox_conversations_prioritized()
RETURNS TABLE (
  lead_id uuid,
  body text,
  direction text,
  sent_at timestamp with time zone,
  read_at timestamp with time zone,
  first_name text,
  last_name text,
  email text,
  status text,
  vehicle_interest text,
  source text,
  lead_type_name text,
  salesperson_id uuid,
  profiles_first_name text,
  profiles_last_name text,
  ai_opt_in boolean,
  has_unread_inbound boolean,
  unread_count bigint,
  latest_inbound_at timestamp with time zone
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH lead_stats AS (
    -- Get stats about inbound messages per lead
    SELECT 
      c.lead_id,
      COUNT(*) FILTER (WHERE c.direction = 'in' AND c.read_at IS NULL) as unread_inbound_count,
      MAX(c.sent_at) FILTER (WHERE c.direction = 'in') as latest_inbound_time,
      MAX(c.sent_at) as latest_message_time
    FROM public.conversations c
    GROUP BY c.lead_id
  ),
  prioritized_messages AS (
    -- For each lead, prioritize showing unread inbound messages, then latest message
    SELECT DISTINCT ON (c.lead_id)
      c.lead_id,
      c.body,
      c.direction,
      c.sent_at,
      c.read_at,
      CASE 
        WHEN ls.unread_inbound_count > 0 THEN true
        ELSE false 
      END as has_unread_inbound,
      COALESCE(ls.unread_inbound_count, 0) as unread_count,
      ls.latest_inbound_time
    FROM public.conversations c
    INNER JOIN lead_stats ls ON ls.lead_id = c.lead_id
    ORDER BY 
      c.lead_id,
      -- First priority: unread inbound messages
      CASE WHEN c.direction = 'in' AND c.read_at IS NULL THEN 1 ELSE 2 END,
      -- Second priority: most recent message
      c.sent_at DESC
  )
  SELECT 
    pm.lead_id,
    pm.body,
    pm.direction,
    pm.sent_at,
    pm.read_at,
    l.first_name,
    l.last_name,
    l.email,
    l.status,
    l.vehicle_interest,
    l.source,
    l.lead_type_name,
    l.salesperson_id,
    p.first_name as profiles_first_name,
    p.last_name as profiles_last_name,
    l.ai_opt_in,
    pm.has_unread_inbound,
    pm.unread_count,
    pm.latest_inbound_time
  FROM prioritized_messages pm
  INNER JOIN public.leads l ON l.id = pm.lead_id
  LEFT JOIN public.profiles p ON p.id = l.salesperson_id
  ORDER BY 
    -- Prioritize leads with unread inbound messages
    pm.has_unread_inbound DESC,
    pm.unread_count DESC,
    -- Then by latest inbound message time
    pm.latest_inbound_time DESC NULLS LAST,
    -- Finally by latest message time
    pm.sent_at DESC;
END;
$function$;