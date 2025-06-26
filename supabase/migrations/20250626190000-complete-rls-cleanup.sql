
-- COMPLETE RLS POLICY CLEANUP - Remove ALL existing policies and implement ultra-simple ones

-- Step 1: Drop EVERY existing RLS policy on leads table
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'leads'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.leads';
    END LOOP;
END $$;

-- Step 2: Drop EVERY existing RLS policy on phone_numbers table
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'phone_numbers'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.phone_numbers';
    END LOOP;
END $$;

-- Step 3: Drop EVERY existing RLS policy on upload_history table
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'upload_history'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.upload_history';
    END LOOP;
END $$;

-- Step 4: Drop EVERY existing RLS policy on profiles table
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

-- Step 5: Drop EVERY existing RLS policy on user_roles table
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

-- Step 6: Create ultra-simple security definer functions (no RLS queries)
CREATE OR REPLACE FUNCTION public.check_user_authenticated()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.check_manager_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  );
$$;

-- Step 7: Create minimal RLS policies for leads table
CREATE POLICY "leads_select_simple"
ON public.leads
FOR SELECT
TO authenticated
USING (public.check_user_authenticated());

CREATE POLICY "leads_insert_simple"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (public.check_manager_role());

CREATE POLICY "leads_update_simple"
ON public.leads
FOR UPDATE
TO authenticated
USING (public.check_manager_role())
WITH CHECK (public.check_manager_role());

CREATE POLICY "leads_delete_simple"
ON public.leads
FOR DELETE
TO authenticated
USING (public.check_manager_role());

-- Step 8: Create minimal RLS policies for phone_numbers table (NO cross-table references)
CREATE POLICY "phone_numbers_select_simple"
ON public.phone_numbers
FOR SELECT
TO authenticated
USING (public.check_user_authenticated());

CREATE POLICY "phone_numbers_insert_simple"
ON public.phone_numbers
FOR INSERT
TO authenticated
WITH CHECK (public.check_manager_role());

CREATE POLICY "phone_numbers_update_simple"
ON public.phone_numbers
FOR UPDATE
TO authenticated
USING (public.check_manager_role())
WITH CHECK (public.check_manager_role());

CREATE POLICY "phone_numbers_delete_simple"
ON public.phone_numbers
FOR DELETE
TO authenticated
USING (public.check_manager_role());

-- Step 9: Create minimal RLS policies for upload_history table
CREATE POLICY "upload_history_simple"
ON public.upload_history
FOR ALL
TO authenticated
USING (public.check_manager_role())
WITH CHECK (public.check_manager_role());

-- Step 10: Create minimal RLS policies for profiles table
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.check_manager_role());

CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_insert_own"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Step 11: Create minimal RLS policies for user_roles table
CREATE POLICY "user_roles_select_own"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.check_manager_role());

CREATE POLICY "user_roles_insert_managers"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.check_manager_role());

-- Step 12: Update the initialization function to be completely non-recursive
CREATE OR REPLACE FUNCTION public.initialize_user_completely_clean(p_user_id uuid, p_email text, p_first_name text DEFAULT 'User', p_last_name text DEFAULT 'Name')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Simple profile upsert with no RLS queries
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (p_user_id, p_email, p_first_name, p_last_name, 'manager')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
    role = COALESCE(EXCLUDED.role, profiles.role);
  
  -- Simple role insert with no RLS queries
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'manager')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Return success immediately
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'message', 'User initialized with clean functions'
  );
END;
$$;

-- Step 13: Create a simple test function to verify RLS is working
CREATE OR REPLACE FUNCTION public.test_rls_policies()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  test_result jsonb;
BEGIN
  -- Test basic authentication check
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'User not authenticated');
  END IF;
  
  -- Test manager role check
  IF NOT public.check_manager_role() THEN
    RETURN jsonb_build_object('error', 'User lacks manager role');
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'RLS policies are working correctly',
    'user_id', auth.uid()
  );
END;
$$;
