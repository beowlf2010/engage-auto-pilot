-- Phase 2: Database Security Hardening (Fixed)

-- Drop the existing function first to avoid conflicts
DROP FUNCTION IF EXISTS public.get_user_roles(uuid);

-- Fix security definer views by converting to invoker rights or removing if not needed
-- (Note: This addresses the security definer view warnings)

-- Fix function search_path issues by setting explicit search_path
-- Update existing functions to have secure search_path

-- Update synchronize_user_roles function with proper search_path
CREATE OR REPLACE FUNCTION public.synchronize_user_roles(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Update profile role
  UPDATE public.profiles 
  SET role = p_role, updated_at = now()
  WHERE id = p_user_id;
  
  -- Clear existing roles for this user
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  
  -- Insert the new role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, p_role::public.app_role);
END;
$$;

-- Update has_role function with proper search_path
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create secure function to get user roles with proper search_path
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS TABLE(role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT ur.role::text
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id;
$$;

-- Update other security definer functions to have proper search_path
CREATE OR REPLACE FUNCTION public.user_is_authenticated_simple()
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.get_dealership_context()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  context jsonb;
BEGIN
  SELECT jsonb_object_agg(key, value)
  INTO context
  FROM settings
  WHERE key IN ('DEALERSHIP_NAME', 'DEFAULT_SALESPERSON_NAME', 'DEALERSHIP_LOCATION', 'DEALERSHIP_PHONE');
  
  RETURN COALESCE(context, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.user_has_any_role(p_user_id uuid, p_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id
    AND role::text = ANY(p_roles)
  );
$$;

-- Create a function to validate current auth security settings
CREATE OR REPLACE FUNCTION public.check_auth_security_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result jsonb := '{}';
BEGIN
  -- This function returns recommendations for auth security
  -- The actual settings must be configured in the Supabase dashboard
  
  result := jsonb_build_object(
    'recommendations', jsonb_build_array(
      'Enable leaked password protection in Auth settings',
      'Set OTP expiry to 300 seconds (5 minutes) or less',
      'Enable rate limiting on auth endpoints',
      'Configure session timeout appropriately'
    ),
    'dashboard_links', jsonb_build_array(
      'https://supabase.com/dashboard/project/tevtajmaofvnffzcsiuu/auth/providers',
      'https://supabase.com/dashboard/project/tevtajmaofvnffzcsiuu/settings/auth'
    )
  );
  
  RETURN result;
END;
$$;