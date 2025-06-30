
-- Add RLS policies for deal_profit_history table to allow authenticated users to perform necessary operations

-- Allow authenticated users to insert profit history records
CREATE POLICY "authenticated_users_can_insert_profit_history"
ON public.deal_profit_history
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to select profit history records
CREATE POLICY "authenticated_users_can_select_profit_history"
ON public.deal_profit_history
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to update profit history records
CREATE POLICY "authenticated_users_can_update_profit_history"
ON public.deal_profit_history
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
