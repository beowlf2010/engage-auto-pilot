-- Security Fix Migration: Address Critical Authorization Issues
-- Phase 1: Fix user role self-modification vulnerability

-- 1. Update user_roles policies to prevent self-modification
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can manage their own roles" ON public.user_roles;

-- New secure policies for user_roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Only admins can insert user roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Only admins can update user roles" 
ON public.user_roles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Only admins can delete user roles" 
ON public.user_roles 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 2. Create secure functions for role checking (fix search path issues)
CREATE OR REPLACE FUNCTION public.get_user_roles(p_user_id uuid)
 RETURNS text[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(array_agg(role::text), ARRAY[]::text[])
  FROM public.user_roles
  WHERE user_id = p_user_id;
$function$;

CREATE OR REPLACE FUNCTION public.user_has_any_role(p_user_id uuid, p_roles text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id
    AND role::text = ANY(p_roles)
  );
$function$;

-- 3. Create secure user initialization function (replacement for CSV clean function)
CREATE OR REPLACE FUNCTION public.initialize_user_secure(
  p_user_id uuid,
  p_email text,
  p_first_name text DEFAULT 'User',
  p_last_name text DEFAULT 'Name',
  p_default_role app_role DEFAULT 'sales'
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  -- Check if user already has a profile
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'User already initialized',
      'user_id', p_user_id
    );
  END IF;

  -- Create profile if it doesn't exist
  INSERT INTO public.profiles (id, email, first_name, last_name, created_at, updated_at)
  VALUES (p_user_id, p_email, p_first_name, p_last_name, now(), now())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    updated_at = now();

  -- Assign default role if user has no roles
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_user_id, p_default_role);
  END IF;

  -- Log the initialization
  INSERT INTO public.security_audit_log (user_id, action, resource_type, details)
  VALUES (
    p_user_id,
    'user_initialized',
    'auth',
    jsonb_build_object(
      'email', p_email,
      'default_role', p_default_role,
      'timestamp', now()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User initialized successfully',
    'user_id', p_user_id,
    'default_role', p_default_role
  );
END;
$function$;

-- 4. Fix existing function search paths
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$function$;

CREATE OR REPLACE FUNCTION public.user_has_manager_access()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  );
$function$;

-- 5. Add audit trigger for role changes
CREATE OR REPLACE FUNCTION public.audit_role_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Log role insertions
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.security_audit_log (user_id, action, resource_type, details)
    VALUES (
      auth.uid(),
      'role_granted',
      'user_roles',
      jsonb_build_object(
        'target_user_id', NEW.user_id,
        'role_granted', NEW.role,
        'timestamp', now()
      )
    );
    RETURN NEW;
  END IF;

  -- Log role deletions
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.security_audit_log (user_id, action, resource_type, details)
    VALUES (
      auth.uid(),
      'role_revoked',
      'user_roles',
      jsonb_build_object(
        'target_user_id', OLD.user_id,
        'role_revoked', OLD.role,
        'timestamp', now()
      )
    );
    RETURN OLD;
  END IF;

  -- Log role updates
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.security_audit_log (user_id, action, resource_type, details)
    VALUES (
      auth.uid(),
      'role_modified',
      'user_roles',
      jsonb_build_object(
        'target_user_id', NEW.user_id,
        'old_role', OLD.role,
        'new_role', NEW.role,
        'timestamp', now()
      )
    );
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$function$;

-- Create the audit trigger
DROP TRIGGER IF EXISTS user_roles_audit_trigger ON public.user_roles;
CREATE TRIGGER user_roles_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_role_changes();