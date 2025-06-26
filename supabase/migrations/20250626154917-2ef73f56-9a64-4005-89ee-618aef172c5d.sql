
-- Drop all existing policies on leads table to eliminate conflicts
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

-- Drop all existing policies on phone_numbers table
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

-- Drop all existing policies on upload_history table
DROP POLICY IF EXISTS "upload_history_policy" ON public.upload_history;
DROP POLICY IF EXISTS "Managers and admins can manage upload history" ON public.upload_history;

-- Create clean, non-recursive policies for leads table
CREATE POLICY "leads_select_for_all"
ON public.leads
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "leads_insert_for_managers"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_leads());

CREATE POLICY "leads_update_for_managers"
ON public.leads
FOR UPDATE
TO authenticated
USING (public.can_manage_leads())
WITH CHECK (public.can_manage_leads());

CREATE POLICY "leads_delete_for_managers"
ON public.leads
FOR DELETE
TO authenticated
USING (public.can_manage_leads());

-- Create clean, non-recursive policies for phone_numbers table
CREATE POLICY "phone_numbers_select_for_all"
ON public.phone_numbers
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "phone_numbers_insert_for_managers"
ON public.phone_numbers
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_leads());

CREATE POLICY "phone_numbers_update_for_managers"
ON public.phone_numbers
FOR UPDATE
TO authenticated
USING (public.can_manage_leads())
WITH CHECK (public.can_manage_leads());

CREATE POLICY "phone_numbers_delete_for_managers"
ON public.phone_numbers
FOR DELETE
TO authenticated
USING (public.can_manage_leads());

-- Create clean policy for upload_history table
CREATE POLICY "upload_history_for_managers"
ON public.upload_history
FOR ALL
TO authenticated
USING (public.can_manage_leads())
WITH CHECK (public.can_manage_leads());
