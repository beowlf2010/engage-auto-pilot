-- Fix function signature conflicts and return types

-- 1. Fix the user role info function to return correct types
DROP FUNCTION IF EXISTS public.get_user_role_info(uuid);

CREATE OR REPLACE FUNCTION public.get_user_role_info(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  user_id uuid,
  email text,
  primary_role text,
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
  IF p_user_id != auth.uid() AND NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.email,
    p.role::text as primary_role,
    COALESCE(array_agg(ur.role::text ORDER BY 
      CASE ur.role
        WHEN 'admin' THEN 1
        WHEN 'manager' THEN 2
        WHEN 'sales' THEN 3
        ELSE 4
      END
    ) FILTER (WHERE ur.role IS NOT NULL), ARRAY[]::text[]) as all_roles,
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = p.id AND role IN ('admin', 'manager')
    ) as has_manager_access,
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = p.id AND role = 'admin'
    ) as is_admin
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.id = p_user_id
  GROUP BY p.id, p.email, p.role;
END;
$$;

-- 2. Drop conflicting functions and recreate with unique signatures
DROP FUNCTION IF EXISTS public.user_has_manager_access();
DROP FUNCTION IF EXISTS public.user_has_manager_access(uuid);

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

-- 3. Create a simple current user manager access check
CREATE OR REPLACE FUNCTION public.current_user_has_manager_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'manager')
  );
$$;