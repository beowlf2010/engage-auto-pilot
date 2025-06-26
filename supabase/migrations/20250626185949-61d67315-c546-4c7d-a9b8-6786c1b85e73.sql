
-- Complete RLS policy cleanup and rebuild to fix stack depth limit exceeded errors

-- Step 1: Drop ALL existing conflicting policies on leads table
DROP POLICY IF EXISTS "leads_select_for_all" ON public.leads;
DROP POLICY IF EXISTS "leads_insert_for_managers" ON public.leads;
DROP POLICY IF EXISTS "leads_update_for_managers" ON public.leads;
DROP POLICY IF EXISTS "leads_delete_for_managers" ON public.leads;
DROP POLICY IF EXISTS "lead_select_policy" ON public.leads;
DROP POLICY IF EXISTS "lead_insert_policy" ON public.leads;
DROP POLICY IF EXISTS "lead_update_policy" ON public.leads;
DROP POLICY IF EXISTS "lead_delete_policy" ON public.leads;
DROP POLICY IF EXISTS "Managers and admins can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Managers and admins can update leads" ON public.leads;
DROP POLICY IF EXISTS "Managers and admins can delete leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.leads;
DROP POLICY IF EXISTS "Users can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Users can view leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update leads" ON public.leads;
DROP POLICY IF EXISTS "Users can delete leads" ON public.leads;

-- Step 2: Drop ALL existing conflicting policies on phone_numbers table
DROP POLICY IF EXISTS "phone_numbers_select_for_all" ON public.phone_numbers;
DROP POLICY IF EXISTS "phone_numbers_insert_for_managers" ON public.phone_numbers;
DROP POLICY IF EXISTS "phone_numbers_update_for_managers" ON public.phone_numbers;
DROP POLICY IF EXISTS "phone_numbers_delete_for_managers" ON public.phone_numbers;
DROP POLICY IF EXISTS "phone_select_policy" ON public.phone_numbers;
DROP POLICY IF EXISTS "phone_insert_policy" ON public.phone_numbers;
DROP POLICY IF EXISTS "phone_update_policy" ON public.phone_numbers;
DROP POLICY IF EXISTS "phone_delete_policy" ON public.phone_numbers;
DROP POLICY IF EXISTS "Managers and admins can insert phone numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Managers and admins can update phone numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Managers and admins can delete phone numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Authenticated users can view phone numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Users can insert phone numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Users can view phone numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Users can update phone numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Users can delete phone numbers" ON public.phone_numbers;

-- Step 3: Drop ALL existing conflicting policies on upload_history table
DROP POLICY IF EXISTS "upload_history_for_managers" ON public.upload_history;
DROP POLICY IF EXISTS "upload_history_policy" ON public.upload_history;
DROP POLICY IF EXISTS "Managers and admins can manage upload history" ON public.upload_history;

-- Step 4: Create completely non-recursive security definer functions
-- These functions will bypass RLS entirely to prevent any recursion
CREATE OR REPLACE FUNCTION public.user_is_authenticated_simple()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.user_has_manager_access()
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

-- Step 5: Create simple, clean RLS policies that don't cause recursion
-- Leads table policies
CREATE POLICY "authenticated_users_can_select_leads"
ON public.leads
FOR SELECT
TO authenticated
USING (public.user_is_authenticated_simple());

CREATE POLICY "managers_can_insert_leads"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (public.user_has_manager_access());

CREATE POLICY "managers_can_update_leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (public.user_has_manager_access())
WITH CHECK (public.user_has_manager_access());

CREATE POLICY "managers_can_delete_leads"
ON public.leads
FOR DELETE
TO authenticated
USING (public.user_has_manager_access());

-- Phone numbers table policies
CREATE POLICY "authenticated_users_can_select_phone_numbers"
ON public.phone_numbers
FOR SELECT
TO authenticated
USING (public.user_is_authenticated_simple());

CREATE POLICY "managers_can_insert_phone_numbers"
ON public.phone_numbers
FOR INSERT
TO authenticated
WITH CHECK (public.user_has_manager_access());

CREATE POLICY "managers_can_update_phone_numbers"
ON public.phone_numbers
FOR UPDATE
TO authenticated
USING (public.user_has_manager_access())
WITH CHECK (public.user_has_manager_access());

CREATE POLICY "managers_can_delete_phone_numbers"
ON public.phone_numbers
FOR DELETE
TO authenticated
USING (public.user_has_manager_access());

-- Upload history table policy
CREATE POLICY "managers_can_manage_upload_history"
ON public.upload_history
FOR ALL
TO authenticated
USING (public.user_has_manager_access())
WITH CHECK (public.user_has_manager_access());

-- Step 6: Ensure the initialization function is simple and non-recursive
CREATE OR REPLACE FUNCTION public.initialize_user_for_csv_clean(p_user_id uuid, p_email text, p_first_name text DEFAULT 'User', p_last_name text DEFAULT 'Name')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ensure profile exists (simple upsert)
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (p_user_id, p_email, p_first_name, p_last_name, 'manager')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
    role = COALESCE(EXCLUDED.role, profiles.role);
  
  -- Ensure manager role exists (simple insert ignore)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'manager')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Return success without querying RLS-protected tables
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'message', 'User initialized successfully for CSV operations'
  );
END;
$$;
