
select public.purge_old_leads(
  p_cutoff := now() - interval '90 days',
  p_dry_run := true
);
