-- **PHASE 1: EMERGENCY ROLE SECURITY FIXES**
-- This migration addresses critical role security vulnerabilities

-- 1. Drop any existing dangerous role policies that allow self-modification
DROP POLICY IF EXISTS "user_roles_insert_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_own" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update their own roles" ON public.user_roles;

-- 2. Create strict admin-only policies for role management
CREATE POLICY "Only admins can insert roles" ON public.user_roles
FOR INSERT
USING (
  auth.uid() IN (
    SELECT user_id FROM public.user_roles 
    WHERE role = 'admin'
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM public.user_roles 
    WHERE role = 'admin'
  )
);

CREATE POLICY "Only admins can update roles" ON public.user_roles
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT user_id FROM public.user_roles 
    WHERE role = 'admin'
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM public.user_roles 
    WHERE role = 'admin'
  )
);

CREATE POLICY "Only admins can delete roles" ON public.user_roles
FOR DELETE
USING (
  auth.uid() IN (
    SELECT user_id FROM public.user_roles 
    WHERE role = 'admin'
  )
);

-- 3. Create secure role modification audit log
CREATE TABLE IF NOT EXISTS public.role_modification_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id uuid NOT NULL,
  modified_by uuid NOT NULL,
  old_role app_role,
  new_role app_role NOT NULL,
  action text NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  reason text,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE public.role_modification_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view role modification audit
CREATE POLICY "Only admins can view role audit" ON public.role_modification_audit
FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM public.user_roles 
    WHERE role = 'admin'
  )
);

-- 4. Create secure role modification function with authorization
CREATE OR REPLACE FUNCTION public.modify_user_role_secure(
  p_target_user_id uuid,
  p_new_role app_role,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_id uuid;
  is_admin boolean := false;
  old_role app_role;
  result jsonb;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Security check: only authenticated users
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Authentication required'
    );
  END IF;
  
  -- Security check: only admins can modify roles
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = current_user_id 
    AND role = 'admin'
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    -- Log unauthorized attempt
    INSERT INTO public.security_audit_log (
      user_id, action, resource_type, details
    ) VALUES (
      current_user_id,
      'unauthorized_role_modification_attempt',
      'user_roles',
      jsonb_build_object(
        'target_user_id', p_target_user_id,
        'attempted_role', p_new_role,
        'timestamp', now()
      )
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Admin privileges required to modify user roles'
    );
  END IF;
  
  -- Get current role for audit
  SELECT role INTO old_role 
  FROM public.user_roles 
  WHERE user_id = p_target_user_id;
  
  -- Prevent admin from removing their own admin role (safety check)
  IF current_user_id = p_target_user_id AND old_role = 'admin' AND p_new_role != 'admin' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot remove your own admin privileges'
    );
  END IF;
  
  -- Update or insert role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_target_user_id, p_new_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Remove old roles that don't match the new one
  DELETE FROM public.user_roles 
  WHERE user_id = p_target_user_id 
  AND role != p_new_role;
  
  -- Update profile role for consistency
  UPDATE public.profiles 
  SET role = p_new_role, updated_at = now()
  WHERE id = p_target_user_id;
  
  -- Log the role modification
  INSERT INTO public.role_modification_audit (
    target_user_id, modified_by, old_role, new_role, action, reason
  ) VALUES (
    p_target_user_id, current_user_id, old_role, p_new_role, 'UPDATE', p_reason
  );
  
  -- Log in security audit
  INSERT INTO public.security_audit_log (
    user_id, action, resource_type, details
  ) VALUES (
    current_user_id,
    'role_modified',
    'user_roles',
    jsonb_build_object(
      'target_user_id', p_target_user_id,
      'old_role', old_role,
      'new_role', p_new_role,
      'reason', p_reason,
      'timestamp', now()
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Role updated successfully',
    'old_role', old_role,
    'new_role', p_new_role
  );
END;
$$;

-- 5. Replace dangerous make_current_user_admin function
CREATE OR REPLACE FUNCTION public.make_current_user_admin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_id uuid;
  existing_admin_count integer;
BEGIN
  current_user_id := auth.uid();
  
  -- Security check: only allow if no admins exist (bootstrap scenario)
  SELECT COUNT(*) INTO existing_admin_count 
  FROM public.user_roles 
  WHERE role = 'admin';
  
  IF existing_admin_count > 0 THEN
    -- Log suspicious attempt
    INSERT INTO public.security_audit_log (
      user_id, action, resource_type, details
    ) VALUES (
      current_user_id,
      'suspicious_admin_creation_attempt',
      'user_roles',
      jsonb_build_object(
        'existing_admin_count', existing_admin_count,
        'timestamp', now()
      )
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Admin users already exist. Use proper role modification procedures.'
    );
  END IF;
  
  -- Bootstrap admin creation (only when no admins exist)
  INSERT INTO public.user_roles (user_id, role) 
  VALUES (current_user_id, 'admin') 
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Update profile
  UPDATE public.profiles 
  SET role = 'admin', updated_at = now()
  WHERE id = current_user_id;
  
  -- Log the bootstrap admin creation
  INSERT INTO public.role_modification_audit (
    target_user_id, modified_by, old_role, new_role, action, reason
  ) VALUES (
    current_user_id, current_user_id, NULL, 'admin', 'INSERT', 'Bootstrap admin creation'
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Bootstrap admin user created successfully'
  );
END;
$$;

-- 6. Secure ensure_manager_role function
CREATE OR REPLACE FUNCTION public.ensure_manager_role(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_id uuid;
  is_admin boolean := false;
BEGIN
  current_user_id := auth.uid();
  
  -- Security check: only admins can ensure manager roles
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = current_user_id 
    AND role = 'admin'
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Admin privileges required to assign manager role';
  END IF;
  
  -- Insert manager role if it doesn't exist
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'manager')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Log the role assignment
  INSERT INTO public.role_modification_audit (
    target_user_id, modified_by, old_role, new_role, action, reason
  ) VALUES (
    p_user_id, current_user_id, NULL, 'manager', 'INSERT', 'Manager role ensured by admin'
  );
END;
$$;