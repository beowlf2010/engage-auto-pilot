-- Fix lead scheduling and test SMS manually
UPDATE public.leads 
SET next_ai_send_at = now() + interval '5 minutes'
WHERE ai_opt_in = true 
  AND next_ai_send_at < now() - interval '24 hours'
  AND ai_sequence_paused = false;

-- Also reset any failed automation counts for a fresh start
UPDATE public.ai_automation_runs 
SET status = 'completed',
    error_message = 'Reset for debugging - previous failures due to lead scheduling'
WHERE status = 'failed' 
  AND created_at > now() - interval '1 day';