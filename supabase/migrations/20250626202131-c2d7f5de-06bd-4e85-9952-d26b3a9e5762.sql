
-- Fix infinite recursion in user_roles RLS policies
-- Drop the problematic policies that cause recursion
DROP POLICY IF EXISTS "user_roles_select_simple" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_simple" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_simple" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete_simple" ON public.user_roles;

-- Create new simple policies that don't cause recursion
-- Users can only access their own roles (no function calls)
CREATE POLICY "user_roles_select_own"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "user_roles_insert_own"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_roles_update_own"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_roles_delete_own"
ON public.user_roles
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
