-- Enable pg_cron if not already enabled
create extension if not exists pg_cron with schema extensions;

-- Create or replace a helper to (upsert) schedule the purge job
create or replace function public.upsert_purge_schedule(
  p_jobname text,
  p_schedule text,
  p_cutoff_days integer,
  p_dry_run boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_user uuid := auth.uid();
  v_allowed boolean := false;
  v_existing_job_id integer;
  v_new_job_id integer;
begin
  -- Only admins/managers may schedule
  select exists (
    select 1 from public.user_roles
    where user_id = v_user and role in ('admin','manager')
  ) into v_allowed;

  if not v_allowed then
    return jsonb_build_object('success', false, 'error', 'Admin or manager role required');
  end if;

  -- Unschedule any existing job with this name
  select jobid into v_existing_job_id
  from cron.job
  where jobname = p_jobname
  limit 1;

  if v_existing_job_id is not null then
    perform cron.unschedule(v_existing_job_id);
  end if;

  -- Schedule new job
  -- This schedules SQL that computes the cutoff dynamically at run time:
  -- now() - interval '<p_cutoff_days> days'
  v_new_job_id := cron.schedule(
    p_jobname,
    p_schedule,
    format(
      $fmt$select public.purge_old_leads((now() - interval '%s days')::timestamptz, false);$fmt$,
      greatest(p_cutoff_days, 1) -- basic safety
    )
  );

  return jsonb_build_object(
    'success', true,
    'jobname', p_jobname,
    'schedule', p_schedule,
    'cutoff_days', p_cutoff_days,
    'job_id', v_new_job_id
  );
end;
$func$;

-- Create or replace a helper to remove a scheduled purge job
create or replace function public.remove_purge_schedule(
  p_jobname text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_user uuid := auth.uid();
  v_allowed boolean := false;
  v_existing_job_id integer;
begin
  -- Only admins/managers may remove
  select exists (
    select 1 from public.user_roles
    where user_id = v_user and role in ('admin','manager')
  ) into v_allowed;

  if not v_allowed then
    return jsonb_build_object('success', false, 'error', 'Admin or manager role required');
  end if;

  select jobid into v_existing_job_id
  from cron.job
  where jobname = p_jobname
  limit 1;

  if v_existing_job_id is null then
    return jsonb_build_object('success', true, 'message', 'No job found', 'jobname', p_jobname);
  end if;

  perform cron.unschedule(v_existing_job_id);

  return jsonb_build_object('success', true, 'message', 'Job removed', 'jobname', p_jobname, 'job_id', v_existing_job_id);
end;
$func$;