-- Create a cron job to update daily KPIs every day at midnight
SELECT cron.schedule(
  'update-daily-kpis',
  '0 0 * * *', -- Every day at midnight
  $$
  SELECT update_daily_kpis();
  $$
);

-- Backfill KPIs for the last 30 days
DO $$
DECLARE
  target_date date;
BEGIN
  FOR target_date IN 
    SELECT generate_series(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, '1 day'::interval)::date
  LOOP
    PERFORM update_daily_kpis(target_date);
  END LOOP;
END $$;