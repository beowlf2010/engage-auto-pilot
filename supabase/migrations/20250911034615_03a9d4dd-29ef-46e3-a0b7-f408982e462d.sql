-- Fix security issues from the role management system

-- 1. Remove the problematic view that exposes auth.users
DROP VIEW IF EXISTS public.user_roles_view;

-- 2. Create a safer function-based approach for role checking
CREATE OR REPLACE FUNCTION public.get_user_role_info(p_user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb;
  user_email text;
  primary_role app_role;
  all_roles text[];
BEGIN
  -- Only allow users to see their own info or admins to see any
  IF p_user_id != auth.uid() AND NOT user_is_admin(auth.uid()) THEN
    RETURN '{"error": "Access denied"}'::jsonb;
  END IF;
  
  -- Get user email safely (no auth.users exposure)
  SELECT email INTO user_email 
  FROM public.profiles 
  WHERE id = p_user_id;
  
  -- Get primary role from profiles
  SELECT role INTO primary_role 
  FROM public.profiles 
  WHERE id = p_user_id;
  
  -- Get all roles
  SELECT array_agg(role::text) INTO all_roles
  FROM public.user_roles 
  WHERE user_id = p_user_id;
  
  result := jsonb_build_object(
    'id', p_user_id,
    'email', user_email,
    'primary_role', primary_role,
    'all_roles', COALESCE(all_roles, ARRAY[]::text[]),
    'has_manager_access', user_has_manager_access(p_user_id),
    'is_admin', user_is_admin(p_user_id)
  );
  
  RETURN result;
END;
$$;

-- 3. Fix search paths for existing functions
CREATE OR REPLACE FUNCTION public.user_has_any_role(p_user_id uuid, p_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id
    AND role::text = ANY(p_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_manager_access(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = COALESCE(p_user_id, auth.uid())
    AND role IN ('admin', 'manager')
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = COALESCE(p_user_id, auth.uid())
    AND role = 'admin'
  );
$$;