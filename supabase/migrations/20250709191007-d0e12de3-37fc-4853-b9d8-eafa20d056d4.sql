
-- Fix role synchronization between profiles.role and user_roles table

-- 1. Create a function to synchronize roles between both tables
CREATE OR REPLACE FUNCTION public.synchronize_user_roles(p_user_id uuid, p_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- 2. Create a function to ensure role consistency on profile updates
CREATE OR REPLACE FUNCTION public.sync_profile_role_to_user_roles()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only sync if role actually changed
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    -- Clear existing roles
    DELETE FROM public.user_roles WHERE user_id = NEW.id;
    
    -- Add the new role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, NEW.role::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Create trigger to keep roles in sync
DROP TRIGGER IF EXISTS sync_profile_role_trigger ON public.profiles;
CREATE TRIGGER sync_profile_role_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_role_to_user_roles();

-- 4. Fix any existing users who have profiles.role but missing user_roles entries
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, p.role::app_role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id AND p.role::text = ur.role::text
WHERE ur.user_id IS NULL 
  AND p.role IS NOT NULL
  AND p.role IN ('admin', 'manager', 'sales', 'user')
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Fix the immediate manager user issue (find users with manager profile role but no user_roles entry)
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'manager'::app_role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id AND ur.role = 'manager'
WHERE p.role = 'manager' 
  AND ur.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;
