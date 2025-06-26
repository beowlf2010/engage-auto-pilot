
-- Fix RLS recursion issues causing stack depth limit exceeded errors

-- Drop existing problematic policies
DROP POLICY IF EXISTS "leads_select_for_all" ON public.leads;
DROP POLICY IF EXISTS "leads_insert_for_managers" ON public.leads;
DROP POLICY IF EXISTS "leads_update_for_managers" ON public.leads;
DROP POLICY IF EXISTS "leads_delete_for_managers" ON public.leads;

DROP POLICY IF EXISTS "phone_numbers_select_for_all" ON public.phone_numbers;
DROP POLICY IF EXISTS "phone_numbers_insert_for_managers" ON public.phone_numbers;
DROP POLICY IF EXISTS "phone_numbers_update_for_managers" ON public.phone_numbers;
DROP POLICY IF EXISTS "phone_numbers_delete_for_managers" ON public.phone_numbers;

DROP POLICY IF EXISTS "upload_history_for_managers" ON public.upload_history;

-- Create improved security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.user_has_manager_role()
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

CREATE OR REPLACE FUNCTION public.user_is_authenticated()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

-- Simplified user profile creation function
CREATE OR REPLACE FUNCTION public.ensure_user_profile_simple(p_user_id uuid, p_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_id uuid;
BEGIN
  -- Try to get existing profile
  SELECT id INTO profile_id FROM public.profiles WHERE id = p_user_id;
  
  IF profile_id IS NULL THEN
    -- Create new profile with minimal data
    INSERT INTO public.profiles (id, email, first_name, last_name, role)
    VALUES (p_user_id, p_email, 'User', 'Name', 'manager')
    RETURNING id INTO profile_id;
  END IF;
  
  RETURN profile_id;
END;
$$;

-- Simplified role assignment function
CREATE OR REPLACE FUNCTION public.ensure_manager_role_simple(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert manager role if it doesn't exist, ignore conflicts
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'manager')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Simplified initialization function that avoids recursion
CREATE OR REPLACE FUNCTION public.initialize_user_for_csv_simple(p_user_id uuid, p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ensure profile exists
  PERFORM public.ensure_user_profile_simple(p_user_id, p_email);
  
  -- Ensure manager role exists
  PERFORM public.ensure_manager_role_simple(p_user_id);
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'message', 'User initialized successfully'
  );
END;
$$;

-- Create simple non-recursive RLS policies
CREATE POLICY "leads_select_authenticated"
ON public.leads
FOR SELECT
TO authenticated
USING (public.user_is_authenticated());

CREATE POLICY "leads_insert_managers"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (public.user_has_manager_role());

CREATE POLICY "leads_update_managers"
ON public.leads
FOR UPDATE
TO authenticated
USING (public.user_has_manager_role())
WITH CHECK (public.user_has_manager_role());

CREATE POLICY "leads_delete_managers"
ON public.leads
FOR DELETE
TO authenticated
USING (public.user_has_manager_role());

-- Phone numbers policies
CREATE POLICY "phone_numbers_select_authenticated"
ON public.phone_numbers
FOR SELECT
TO authenticated
USING (public.user_is_authenticated());

CREATE POLICY "phone_numbers_insert_managers"
ON public.phone_numbers
FOR INSERT
TO authenticated
WITH CHECK (public.user_has_manager_role());

CREATE POLICY "phone_numbers_update_managers"
ON public.phone_numbers
FOR UPDATE
TO authenticated
USING (public.user_has_manager_role())
WITH CHECK (public.user_has_manager_role());

CREATE POLICY "phone_numbers_delete_managers"
ON public.phone_numbers
FOR DELETE
TO authenticated
USING (public.user_has_manager_role());

-- Upload history policy
CREATE POLICY "upload_history_managers"
ON public.upload_history
FOR ALL
TO authenticated
USING (public.user_has_manager_role())
WITH CHECK (public.user_has_manager_role());
