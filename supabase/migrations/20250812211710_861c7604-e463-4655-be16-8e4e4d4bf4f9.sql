
-- Execute the live purge (not a dry run) with a 90-day cutoff
select public.purge_old_leads(
  p_cutoff := now() - interval '90 days',
  p_dry_run := false
);
