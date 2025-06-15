
-- Enable pg_cron and pg_net
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Schedule daily job to call inventory-cleanup-edge function every night at 2am (UTC)
select
  cron.schedule(
    'nightly-inventory-cleanup',
    '0 2 * * *', -- 2am UTC daily
    $$
    select
      net.http_post(
        url:='https://tevtajmaofvnffzcsiuu.functions.supabase.co/inventory-cleanup-edge',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVC...umg"}'::jsonb,
        body:='{"reason":"nightly cleanup"}'::jsonb
      ) as request_id;
    $$
  );
