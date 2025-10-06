-- =====================================================
-- Security Fix: Public Data Exposure & Role Management
-- =====================================================

-- ============================================
-- Fix 1: Restrict appointment_slots table
-- ============================================
-- Drop any existing permissive policies
DROP POLICY IF EXISTS "Allow all operations" ON public.appointment_slots;
DROP POLICY IF EXISTS "Public can view slots" ON public.appointment_slots;

-- Authenticated users can view available appointment slots
CREATE POLICY "Authenticated users can view appointment slots"
ON public.appointment_slots
FOR SELECT
TO authenticated
USING (true);

-- Only admin/manager can insert, update, delete appointment slots
CREATE POLICY "Admins and managers can manage appointment slots"
ON public.appointment_slots
FOR ALL
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

COMMENT ON TABLE public.appointment_slots IS 'Contains appointment scheduling data including available time slots and booking capacity. Access restricted to authenticated users for viewing, admin/manager for modifications.';

-- ============================================
-- Fix 2: Restrict email_templates table
-- ============================================
-- Drop existing policies that use profiles.role
DROP POLICY IF EXISTS "Managers can delete email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Managers can insert email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Managers can update email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Users can view email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Allow all operations" ON public.email_templates;

-- Authenticated users can view email templates
CREATE POLICY "Authenticated users can view email templates"
ON public.email_templates
FOR SELECT
TO authenticated
USING (true);

-- Admin/manager can insert email templates
CREATE POLICY "Admins and managers can insert email templates"
ON public.email_templates
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'manager')
  )
);

-- Admin/manager can update email templates
CREATE POLICY "Admins and managers can update email templates"
ON public.email_templates
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

-- Admin/manager can delete email templates
CREATE POLICY "Admins and managers can delete email templates"
ON public.email_templates
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'manager')
  )
);

COMMENT ON TABLE public.email_templates IS 'Contains marketing email templates with full content and messaging strategies. Access restricted to authenticated users for viewing, admin/manager for modifications.';

-- ============================================
-- Fix 3: Restrict stores table (if exists)
-- ============================================
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stores') THEN
    -- Drop any permissive policies
    EXECUTE 'DROP POLICY IF EXISTS "Allow all operations" ON public.stores';
    EXECUTE 'DROP POLICY IF EXISTS "Public can view stores" ON public.stores';
    
    -- Only admin/manager can access store information
    EXECUTE 'CREATE POLICY "Admins and managers can manage stores"
    ON public.stores
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN (''admin'', ''manager'')
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN (''admin'', ''manager'')
      )
    )';
    
    EXECUTE 'COMMENT ON TABLE public.stores IS ''Contains store/location business data. Access restricted to authenticated admin and manager users only.''';
  END IF;
END $$;

-- ============================================
-- Fix 4: Restrict inventory_snapshots table (if exists)
-- ============================================
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory_snapshots') THEN
    -- Drop any permissive policies
    EXECUTE 'DROP POLICY IF EXISTS "Allow all operations" ON public.inventory_snapshots';
    EXECUTE 'DROP POLICY IF EXISTS "Public can view inventory_snapshots" ON public.inventory_snapshots';
    
    -- Only admin/manager can access inventory snapshots
    EXECUTE 'CREATE POLICY "Admins and managers can manage inventory snapshots"
    ON public.inventory_snapshots
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN (''admin'', ''manager'')
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN (''admin'', ''manager'')
      )
    )';
    
    EXECUTE 'COMMENT ON TABLE public.inventory_snapshots IS ''Contains historical inventory data and business intelligence. Access restricted to authenticated admin and manager users only.''';
  END IF;
END $$;

-- ============================================
-- Fix 5: Add search_path to key functions
-- ============================================

-- Update get_dealership_context function
CREATE OR REPLACE FUNCTION public.get_dealership_context()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  context jsonb;
BEGIN
  SELECT jsonb_object_agg(key, value)
  INTO context
  FROM settings
  WHERE key IN ('DEALERSHIP_NAME', 'DEFAULT_SALESPERSON_NAME', 'DEALERSHIP_LOCATION', 'DEALERSHIP_PHONE');
  
  RETURN COALESCE(context, '{}'::jsonb);
END;
$function$;

-- Update get_user_roles function
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS TABLE(role text)
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT ur.role::text
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id;
$function$;

-- Update synchronize_user_roles function
CREATE OR REPLACE FUNCTION public.synchronize_user_roles(p_user_id uuid, p_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update the profile role
  UPDATE public.profiles 
  SET role = p_role, updated_at = now()
  WHERE id = p_user_id;
  
  -- Clear existing roles in user_roles table for this user
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  
  -- Add the new role to user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, p_role);
  
  -- Log the role change for security audit
  PERFORM public.log_security_event(
    'role_synchronized',
    'user_roles',
    p_user_id::text,
    jsonb_build_object(
      'new_role', p_role,
      'synchronized_by', auth.uid(),
      'timestamp', now()
    )
  );
END;
$function$;

-- Add comment to profiles table documenting role column deprecation
COMMENT ON COLUMN public.profiles.role IS 'Legacy role column - synced from user_roles table. Use user_roles table as the source of truth for role management.';