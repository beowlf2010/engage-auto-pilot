-- FINAL SECURITY HARDENING: Complete all remaining functions
-- Fix the last 36 functions that need search_path

-- Get list of remaining unsecured functions first
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as args
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND 'search_path=public' != ALL(COALESCE(p.proconfig, ARRAY[]::text[]))
ORDER BY p.proname
LIMIT 20;