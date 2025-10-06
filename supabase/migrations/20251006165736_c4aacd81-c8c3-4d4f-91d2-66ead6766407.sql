-- =====================================================
-- Fix: Business Strategy and Financial Targets Exposure
-- =====================================================
-- Drop the overly permissive public policy that allows anyone to access sensitive strategy data
DROP POLICY IF EXISTS "Allow all operations" ON public.strategy_configs;

-- Create secure RLS policies that restrict access to admin/manager users only
-- Admins and managers can view strategy configurations
CREATE POLICY "Admins and managers can view strategy configs"
ON public.strategy_configs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'manager')
  )
);

-- Admins and managers can insert strategy configurations
CREATE POLICY "Admins and managers can insert strategy configs"
ON public.strategy_configs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'manager')
  )
);

-- Admins and managers can update strategy configurations
CREATE POLICY "Admins and managers can update strategy configs"
ON public.strategy_configs
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'manager')
  )
);

-- Admins and managers can delete strategy configurations
CREATE POLICY "Admins and managers can delete strategy configs"
ON public.strategy_configs
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'manager')
  )
);

-- Add comment documenting the security requirement
COMMENT ON TABLE public.strategy_configs IS 'Contains sensitive business strategy data including budget caps, target days supply, lot capacity, and profit vs speed weighting. Access restricted to authenticated admin and manager users only.';