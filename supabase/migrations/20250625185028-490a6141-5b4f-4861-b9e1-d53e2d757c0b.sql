
-- Drop all existing policies on leads table (more comprehensive)
DROP POLICY IF EXISTS "Managers and admins can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Managers and admins can update leads" ON public.leads;
DROP POLICY IF EXISTS "Managers and admins can delete leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.leads;
DROP POLICY IF EXISTS "Users can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Users can view leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update leads" ON public.leads;
DROP POLICY IF EXISTS "Users can delete leads" ON public.leads;

-- Drop all existing policies on phone_numbers table
DROP POLICY IF EXISTS "Managers and admins can insert phone numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Managers and admins can update phone numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Managers and admins can delete phone numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Authenticated users can view phone numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Users can insert phone numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Users can view phone numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Users can update phone numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Users can delete phone numbers" ON public.phone_numbers;

-- Drop all existing policies on upload_history table
DROP POLICY IF EXISTS "Managers and admins can manage upload history" ON public.upload_history;

-- Create the security definer functions (will replace if they exist)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.can_manage_leads()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  );
$$;

-- Create new non-recursive policies for leads table
CREATE POLICY "lead_select_policy"
ON public.leads
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "lead_insert_policy"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_leads());

CREATE POLICY "lead_update_policy"
ON public.leads
FOR UPDATE
TO authenticated
USING (public.can_manage_leads())
WITH CHECK (public.can_manage_leads());

CREATE POLICY "lead_delete_policy"
ON public.leads
FOR DELETE
TO authenticated
USING (public.can_manage_leads());

-- Create policies for phone_numbers table
CREATE POLICY "phone_select_policy"
ON public.phone_numbers
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "phone_insert_policy"
ON public.phone_numbers
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_leads());

CREATE POLICY "phone_update_policy"
ON public.phone_numbers
FOR UPDATE
TO authenticated
USING (public.can_manage_leads())
WITH CHECK (public.can_manage_leads());

CREATE POLICY "phone_delete_policy"
ON public.phone_numbers
FOR DELETE
TO authenticated
USING (public.can_manage_leads());

-- Create policy for upload_history table
CREATE POLICY "upload_history_policy"
ON public.upload_history
FOR ALL
TO authenticated
USING (public.can_manage_leads())
WITH CHECK (public.can_manage_leads());
