-- Fix security warnings from the linter

-- 1. Drop the problematic view that exposes auth.users
DROP VIEW IF EXISTS public.user_roles_view;

-- 2. Create a secure function instead of a view to get user role information
CREATE OR REPLACE FUNCTION public.get_user_role_info(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  user_id uuid,
  email text,
  primary_role app_role,
  all_roles text[],
  has_manager_access boolean,
  is_admin boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only allow users to view their own info or managers to view others
  IF p_user_id != auth.uid() AND NOT user_has_manager_access(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.email,
    p.role as primary_role,
    array_agg(ur.role::text ORDER BY 
      CASE ur.role
        WHEN 'admin' THEN 1
        WHEN 'manager' THEN 2
        WHEN 'sales' THEN 3
        ELSE 4
      END
    ) as all_roles,
    user_has_manager_access(p.id) as has_manager_access,
    user_is_admin(p.id) as is_admin
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.id = p_user_id
  GROUP BY p.id, p.email, p.role;
END;
$$;

-- 3. Update all existing functions to have proper search_path
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