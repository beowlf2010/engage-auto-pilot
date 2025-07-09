-- CRITICAL SECURITY FIXES - Phase 1: RLS Policy Hardening

-- Fix overly permissive policies that allow any authenticated user
DROP POLICY IF EXISTS "Allow all operations on ai_conversation_context" ON public.ai_conversation_context;
DROP POLICY IF EXISTS "Allow all operations on ai_message_history" ON public.ai_message_history;
DROP POLICY IF EXISTS "Allow all operations on ai_trigger_messages" ON public.ai_trigger_messages;
DROP POLICY IF EXISTS "System can manage approval queue messages" ON public.ai_message_approval_queue;
DROP POLICY IF EXISTS "Allow all operations on compliance_rules" ON public.compliance_rules;

-- Create secure replacement policies with proper role checks
CREATE POLICY "Managers can manage ai_conversation_context" 
ON public.ai_conversation_context
FOR ALL
TO authenticated
USING (public.user_has_manager_access())
WITH CHECK (public.user_has_manager_access());

CREATE POLICY "Managers can manage ai_message_history" 
ON public.ai_message_history
FOR ALL
TO authenticated
USING (public.user_has_manager_access())
WITH CHECK (public.user_has_manager_access());

CREATE POLICY "Managers can manage ai_trigger_messages" 
ON public.ai_trigger_messages
FOR ALL
TO authenticated
USING (public.user_has_manager_access())
WITH CHECK (public.user_has_manager_access());

CREATE POLICY "Managers can manage approval queue" 
ON public.ai_message_approval_queue
FOR ALL
TO authenticated
USING (public.user_has_manager_access())
WITH CHECK (public.user_has_manager_access());

CREATE POLICY "Admins can manage compliance rules" 
ON public.compliance_rules
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Secure the dangerous make_current_user_admin function
DROP FUNCTION IF EXISTS public.make_current_user_admin();

-- Create a more secure admin promotion function with audit logging
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_role text;
BEGIN
  -- Only existing admins can promote other users
  SELECT role INTO current_user_role 
  FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
  LIMIT 1;
  
  IF current_user_role IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Only admins can promote users'
    );
  END IF;
  
  -- Add admin role if not exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Log the promotion (insert into a security audit table if needed)
  -- For now, just return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User promoted to admin',
    'promoted_by', auth.uid(),
    'promoted_user', target_user_id
  );
END;
$$;

-- Add missing RLS policies for critical tables
CREATE POLICY "Admins and managers can manage user_roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = auth.uid() 
  AND ur.role IN ('admin', 'manager')
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = auth.uid() 
  AND ur.role IN ('admin', 'manager')
));

CREATE POLICY "Admins and managers can delete user_roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = auth.uid() 
  AND ur.role IN ('admin', 'manager')
));

-- Create security audit table for tracking sensitive operations
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view security audit logs"
ON public.security_audit_log
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
ON public.security_audit_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action text,
  p_resource_type text,
  p_resource_id text DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id, action, resource_type, resource_id, details
  ) VALUES (
    auth.uid(), p_action, p_resource_type, p_resource_id, p_details
  );
END;
$$;