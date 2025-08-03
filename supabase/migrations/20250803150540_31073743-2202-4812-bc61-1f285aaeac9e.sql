-- FINAL SECURITY CLEANUP: Fix the last 3 RLS policy gaps
-- These were the exact tables identified by the linter

-- Add RLS policies for key_moves table
CREATE POLICY "Users can manage their own key moves" 
ON public.key_moves 
FOR ALL 
USING (user_has_manager_access())
WITH CHECK (user_has_manager_access());

-- Add RLS policies for recon_attachments table  
CREATE POLICY "Users can manage recon attachments"
ON public.recon_attachments
FOR ALL
USING (user_has_manager_access())
WITH CHECK (user_has_manager_access());

-- Add RLS policies for recon_logs table
CREATE POLICY "Users can manage recon logs"
ON public.recon_logs  
FOR ALL
USING (user_has_manager_access())
WITH CHECK (user_has_manager_access());

-- Check for any remaining views with SECURITY DEFINER
SELECT 
  schemaname,
  viewname,
  viewowner,
  CASE 
    WHEN definition ILIKE '%security definer%' THEN 'HAS SECURITY DEFINER'
    ELSE 'Clean'
  END as security_status
FROM pg_views 
WHERE schemaname = 'public'
ORDER BY viewname;