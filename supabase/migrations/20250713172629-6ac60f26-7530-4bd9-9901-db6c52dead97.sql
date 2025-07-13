-- Update RLS policies to ensure proper conversation visibility for managers
-- First, let's create a better policy for conversations that allows managers to see all conversations

-- Drop existing conversation select policy
DROP POLICY IF EXISTS "conversations_select_authenticated" ON public.conversations;

-- Create new policies that allow managers to see all conversations and regular users to see their own
CREATE POLICY "conversations_select_managers_all" ON public.conversations
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL AND 
    user_has_manager_access()
  );

CREATE POLICY "conversations_select_users_own" ON public.conversations
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL AND 
    NOT user_has_manager_access() AND
    EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = conversations.lead_id 
      AND l.salesperson_id = auth.uid()
    )
  );

-- Similarly update leads policies
DROP POLICY IF EXISTS "leads_select_authenticated" ON public.leads;

CREATE POLICY "leads_select_managers_all" ON public.leads
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL AND 
    user_has_manager_access()
  );

CREATE POLICY "leads_select_users_own" ON public.leads
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL AND 
    NOT user_has_manager_access() AND
    salesperson_id = auth.uid()
  );

-- Update phone_numbers policies
DROP POLICY IF EXISTS "phone_numbers_select_authenticated" ON public.phone_numbers;

CREATE POLICY "phone_numbers_select_managers_all" ON public.phone_numbers
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL AND 
    user_has_manager_access()
  );

CREATE POLICY "phone_numbers_select_users_own" ON public.phone_numbers
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL AND 
    NOT user_has_manager_access() AND
    EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = phone_numbers.lead_id 
      AND l.salesperson_id = auth.uid()
    )
  );