-- EMERGENCY: Disable the active AI automation cron job that's causing SMS spam
SELECT cron.unschedule('ai-automation-every-10-minutes');

-- Verify the job was removed
SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE '%ai%' OR jobname LIKE '%automation%';