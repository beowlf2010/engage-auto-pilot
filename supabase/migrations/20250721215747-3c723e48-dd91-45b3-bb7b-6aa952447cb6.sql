
-- PHASE 1: Enable RLS on conversations table
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- PHASE 2: Create RLS policies for conversations table

-- Policy for managers/admins to see all conversations
CREATE POLICY "conversations_select_managers_all" ON public.conversations
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL AND 
    user_has_manager_access()
  );

-- Policy for regular users to see conversations for their assigned leads
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

-- Policy for managers/admins to insert conversations
CREATE POLICY "conversations_insert_managers" ON public.conversations
  FOR INSERT 
  WITH CHECK (
    auth.uid() IS NOT NULL AND 
    user_has_manager_access()
  );

-- Policy for regular users to insert conversations for their leads
CREATE POLICY "conversations_insert_users_own" ON public.conversations
  FOR INSERT 
  WITH CHECK (
    auth.uid() IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = conversations.lead_id 
      AND (l.salesperson_id = auth.uid() OR user_has_manager_access())
    )
  );

-- Policy for managers/admins to update conversations
CREATE POLICY "conversations_update_managers" ON public.conversations
  FOR UPDATE 
  USING (
    auth.uid() IS NOT NULL AND 
    user_has_manager_access()
  );

-- Policy for regular users to update conversations for their leads  
CREATE POLICY "conversations_update_users_own" ON public.conversations
  FOR UPDATE 
  USING (
    auth.uid() IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = conversations.lead_id 
      AND (l.salesperson_id = auth.uid() OR user_has_manager_access())
    )
  );

-- PHASE 4: Enable RLS on other critical tables that currently have it disabled

-- Enable RLS on phone_numbers table (if not already enabled)
ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;

-- Create phone_numbers policies if they don't exist
DROP POLICY IF EXISTS "phone_numbers_select_managers_all" ON public.phone_numbers;
DROP POLICY IF EXISTS "phone_numbers_select_users_own" ON public.phone_numbers;

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
