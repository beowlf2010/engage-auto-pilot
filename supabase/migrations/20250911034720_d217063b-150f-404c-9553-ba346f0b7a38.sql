-- ============================================
-- STREAMLINED ROLE MANAGEMENT SYSTEM (FIXED)
-- ============================================

-- 1. Create a comprehensive role check function that prevents recursion
CREATE OR REPLACE FUNCTION public.user_has_any_role(p_user_id uuid, p_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id
    AND role::text = ANY(p_roles)
  );
$$;

-- 2. Enhanced manager access function
CREATE OR REPLACE FUNCTION public.user_has_manager_access(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = COALESCE(p_user_id, auth.uid())
    AND role IN ('admin', 'manager')
  );
$$;

-- 3. Admin check function
CREATE OR REPLACE FUNCTION public.user_is_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = COALESCE(p_user_id, auth.uid())
    AND role = 'admin'
  );
$$;

-- 4. Role synchronization function to keep profiles.role in sync
CREATE OR REPLACE FUNCTION public.sync_user_primary_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  primary_role app_role;
BEGIN
  -- Determine primary role (highest level)
  SELECT role INTO primary_role
  FROM public.user_roles 
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'manager' THEN 2
      WHEN 'sales' THEN 3
      ELSE 4
    END
  LIMIT 1;

  -- Update profile with primary role
  UPDATE public.profiles 
  SET role = COALESCE(primary_role, 'sales'::app_role), 
      updated_at = now()
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 5. Create trigger to auto-sync roles
DROP TRIGGER IF EXISTS sync_profile_role_trigger ON public.user_roles;
CREATE TRIGGER sync_profile_role_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_primary_role();

-- 6. Function to safely assign roles (prevents duplicates)
CREATE OR REPLACE FUNCTION public.assign_user_role(p_user_id uuid, p_role app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert role if it doesn't exist
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, p_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

-- 7. Function to remove roles safely
CREATE OR REPLACE FUNCTION public.remove_user_role(p_user_id uuid, p_role app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.user_roles 
  WHERE user_id = p_user_id AND role = p_role;
  
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

-- 8. Ensure current admin has all necessary roles
DO $$
DECLARE
  admin_user_id uuid := 'bfd46fe7-6f27-4615-97b2-481ac1599c88'; -- Your user ID
BEGIN
  -- Ensure admin role exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_user_id, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Ensure manager role exists (admin includes manager permissions)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_user_id, 'manager'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Update profile to admin
  UPDATE public.profiles 
  SET role = 'admin'::app_role, updated_at = now()
  WHERE id = admin_user_id;
END $$;

-- 9. Create a view for easy role checking
CREATE OR REPLACE VIEW public.user_roles_view AS
SELECT 
  u.id,
  u.email,
  p.role as primary_role,
  array_agg(ur.role::text ORDER BY 
    CASE ur.role
      WHEN 'admin' THEN 1
      WHEN 'manager' THEN 2
      WHEN 'sales' THEN 3
      ELSE 4
    END
  ) as all_roles,
  user_has_manager_access(u.id) as has_manager_access,
  user_is_admin(u.id) as is_admin
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
GROUP BY u.id, u.email, p.role;