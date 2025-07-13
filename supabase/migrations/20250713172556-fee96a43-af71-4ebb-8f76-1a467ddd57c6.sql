-- Check if there are any restrictive policies on leads that filter by salesperson
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE qual LIKE '%salesperson%' OR with_check LIKE '%salesperson%';

-- Also check the user functions to understand the logic
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_name IN ('user_is_authenticated_simple', 'user_has_manager_access')
AND routine_schema = 'public';