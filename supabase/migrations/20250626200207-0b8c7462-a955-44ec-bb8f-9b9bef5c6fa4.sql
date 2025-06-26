
-- Comprehensive RLS cleanup - remove ALL policies using problematic functions

-- Step 1: Drop ALL policies on conversations table that use get_current_user_role
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'conversations'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.conversations';
    END LOOP;
END $$;

-- Step 2: Drop ALL policies on conversation_memory table that use get_current_user_role
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'conversation_memory'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.conversation_memory';
    END LOOP;
END $$;

-- Step 3: Drop ALL policies on leads table that could cause recursion
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

-- Step 4: Drop ALL policies on phone_numbers table that could cause recursion
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

-- Step 5: Drop ALL policies on upload_history table
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

-- Step 6: Now safely drop the problematic functions
DROP FUNCTION IF EXISTS public.get_current_user_role();
DROP FUNCTION IF EXISTS public.can_manage_leads();

-- Step 7: Create clean, non-recursive RLS policies for leads table
CREATE POLICY "leads_select_authenticated"
ON public.leads
FOR SELECT
TO authenticated
USING (public.user_is_authenticated_simple());

CREATE POLICY "leads_insert_managers"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (public.user_has_manager_access());

CREATE POLICY "leads_update_managers"
ON public.leads
FOR UPDATE
TO authenticated
USING (public.user_has_manager_access())
WITH CHECK (public.user_has_manager_access());

CREATE POLICY "leads_delete_managers"
ON public.leads
FOR DELETE
TO authenticated
USING (public.user_has_manager_access());

-- Step 8: Create clean, non-recursive RLS policies for phone_numbers table
CREATE POLICY "phone_numbers_select_authenticated"
ON public.phone_numbers
FOR SELECT
TO authenticated
USING (public.user_is_authenticated_simple());

CREATE POLICY "phone_numbers_insert_managers"
ON public.phone_numbers
FOR INSERT
TO authenticated
WITH CHECK (public.user_has_manager_access());

CREATE POLICY "phone_numbers_update_managers"
ON public.phone_numbers
FOR UPDATE
TO authenticated
USING (public.user_has_manager_access())
WITH CHECK (public.user_has_manager_access());

CREATE POLICY "phone_numbers_delete_managers"
ON public.phone_numbers
FOR DELETE
TO authenticated
USING (public.user_has_manager_access());

-- Step 9: Create clean policy for upload_history table
CREATE POLICY "upload_history_managers"
ON public.upload_history
FOR ALL
TO authenticated
USING (public.user_has_manager_access())
WITH CHECK (public.user_has_manager_access());

-- Step 10: Create clean policies for conversations table
CREATE POLICY "conversations_select_authenticated"
ON public.conversations
FOR SELECT
TO authenticated
USING (public.user_is_authenticated_simple());

CREATE POLICY "conversations_insert_managers"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (public.user_has_manager_access());

CREATE POLICY "conversations_update_managers"
ON public.conversations
FOR UPDATE
TO authenticated
USING (public.user_has_manager_access())
WITH CHECK (public.user_has_manager_access());

CREATE POLICY "conversations_delete_managers"
ON public.conversations
FOR DELETE
TO authenticated
USING (public.user_has_manager_access());

-- Step 11: Create clean policies for conversation_memory table
CREATE POLICY "conversation_memory_select_authenticated"
ON public.conversation_memory
FOR SELECT
TO authenticated
USING (public.user_is_authenticated_simple());

CREATE POLICY "conversation_memory_insert_managers"
ON public.conversation_memory
FOR INSERT
TO authenticated
WITH CHECK (public.user_has_manager_access());

CREATE POLICY "conversation_memory_update_managers"
ON public.conversation_memory
FOR UPDATE
TO authenticated
USING (public.user_has_manager_access())
WITH CHECK (public.user_has_manager_access());

CREATE POLICY "conversation_memory_delete_managers"
ON public.conversation_memory
FOR DELETE
TO authenticated
USING (public.user_has_manager_access());
