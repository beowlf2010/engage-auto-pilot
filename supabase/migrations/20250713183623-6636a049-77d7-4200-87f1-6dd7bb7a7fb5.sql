-- EMERGENCY: Disable all AI automation cron jobs to stop SMS spam
-- Remove the cron job that's triggering AI automation every 10 minutes

SELECT cron.unschedule('ai-automation-every-15-minutes');
SELECT cron.unschedule('enhanced-ai-automation-peak-hours'); 
SELECT cron.unschedule('enhanced-ai-automation-off-peak');
SELECT cron.unschedule('ai-queue-health-monitor');

-- Verify no more AI automation cron jobs exist
SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE '%ai-automation%' OR jobname LIKE '%ai-queue%';