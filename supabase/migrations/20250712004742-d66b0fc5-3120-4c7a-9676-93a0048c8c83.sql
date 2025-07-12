-- Remove the old incorrect cron job
SELECT cron.unschedule('ai-automation-scheduler');

-- Verify only the correct job remains
SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE '%ai-automation%';