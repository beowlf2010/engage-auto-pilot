
-- Complete RLS policy cleanup for profiles and user_roles tables (corrected)

-- Step 1: Clean up profiles table policies
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;

-- Remove any problematic policies that might reference get_current_user_role
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.profiles';
    END LOOP;
END $$;

-- Step 2: Create proper RLS policies for profiles table
CREATE POLICY "profiles_select_simple"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.user_has_manager_access());

CREATE POLICY "profiles_insert_simple"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_simple"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Step 3: Clean up user_roles table policies
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_managers" ON public.user_roles;

-- Remove any existing policies on user_roles
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'user_roles'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.user_roles';
    END LOOP;
END $$;

-- Step 4: Create proper RLS policies for user_roles table
CREATE POLICY "user_roles_select_simple"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.user_has_manager_access());

CREATE POLICY "user_roles_insert_simple"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR public.user_has_manager_access());

CREATE POLICY "user_roles_update_simple"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.user_has_manager_access())
WITH CHECK (user_id = auth.uid() OR public.user_has_manager_access());

CREATE POLICY "user_roles_delete_simple"
ON public.user_roles
FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR public.user_has_manager_access());
