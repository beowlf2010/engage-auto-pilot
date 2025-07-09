-- CRITICAL SECURITY FIXES - Phase 2: Function Hardening and Enhanced Access Control

-- Step 1: Secure the dangerous RLS bypass functions with proper authorization
DROP FUNCTION IF EXISTS public.upload_csv_leads_v2(jsonb, uuid);
DROP FUNCTION IF EXISTS public.upload_csv_leads_bypass_rls(jsonb, uuid);

-- Create a more secure CSV upload function with proper authorization
CREATE OR REPLACE FUNCTION public.upload_csv_leads_secure(
  p_leads jsonb, 
  p_upload_history_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  lead_record jsonb;
  inserted_lead_id uuid;
  phone_record jsonb;
  total_processed integer := 0;
  successful_inserts integer := 0;
  errors jsonb := '[]'::jsonb;
  result jsonb;
  current_user_id uuid;
  user_has_permission boolean := false;
BEGIN
  -- CRITICAL: Verify user authentication and authorization
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Authentication required',
      'totalProcessed', 0,
      'successfulInserts', 0,
      'message', 'User must be authenticated to upload leads'
    );
  END IF;
  
  -- Check if user has manager or admin role
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = current_user_id 
    AND role IN ('admin', 'manager')
  ) INTO user_has_permission;
  
  IF NOT user_has_permission THEN
    -- Log unauthorized access attempt
    PERFORM public.log_security_event(
      'unauthorized_csv_upload_attempt',
      'leads',
      NULL,
      jsonb_build_object(
        'user_id', current_user_id,
        'attempted_records', jsonb_array_length(p_leads),
        'timestamp', now()
      )
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient permissions',
      'totalProcessed', 0,
      'successfulInserts', 0,
      'message', 'Manager or admin role required for CSV uploads'
    );
  END IF;
  
  -- Log authorized upload attempt
  PERFORM public.log_security_event(
    'csv_upload_started',
    'leads',
    p_upload_history_id::text,
    jsonb_build_object(
      'user_id', current_user_id,
      'record_count', jsonb_array_length(p_leads),
      'timestamp', now()
    )
  );
  
  -- Rate limiting: Check for too many recent uploads
  IF EXISTS (
    SELECT 1 FROM public.security_audit_log
    WHERE user_id = current_user_id
    AND action = 'csv_upload_started'
    AND created_at > now() - interval '1 hour'
    GROUP BY user_id
    HAVING COUNT(*) > 5
  ) THEN
    PERFORM public.log_security_event(
      'rate_limit_exceeded',
      'leads',
      NULL,
      jsonb_build_object('user_id', current_user_id, 'action', 'csv_upload')
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Rate limit exceeded',
      'message', 'Too many upload attempts. Please wait before trying again.'
    );
  END IF;
  
  -- Process leads with proper error handling
  FOR lead_record IN SELECT * FROM jsonb_array_elements(p_leads)
  LOOP
    total_processed := total_processed + 1;
    
    BEGIN
      inserted_lead_id := gen_random_uuid();
      
      -- Insert lead with explicit RLS compliance
      INSERT INTO leads (
        id, first_name, last_name, middle_name, email, email_alt,
        address, city, state, postal_code, vehicle_interest,
        vehicle_vin, source, status, do_not_call, do_not_email,
        do_not_mail, upload_history_id, created_at, updated_at
      )
      VALUES (
        inserted_lead_id,
        lead_record->>'firstName',
        lead_record->>'lastName', 
        lead_record->>'middleName',
        lead_record->>'email',
        lead_record->>'emailAlt',
        lead_record->>'address',
        lead_record->>'city',
        lead_record->>'state',
        lead_record->>'postalCode',
        COALESCE(lead_record->>'vehicleInterest', 'finding the right vehicle for your needs'),
        lead_record->>'vehicleVIN',
        COALESCE(lead_record->>'source', 'CSV Import'),
        COALESCE(lead_record->>'status', 'new'),
        COALESCE((lead_record->>'doNotCall')::boolean, false),
        COALESCE((lead_record->>'doNotEmail')::boolean, false),
        COALESCE((lead_record->>'doNotMail')::boolean, false),
        p_upload_history_id,
        now(),
        now()
      );
      
      -- Insert phone numbers with proper validation
      IF lead_record->'phoneNumbers' IS NOT NULL THEN
        FOR phone_record IN SELECT * FROM jsonb_array_elements(lead_record->'phoneNumbers')
        LOOP
          INSERT INTO phone_numbers (
            id, lead_id, number, type, priority, status, is_primary, created_at
          )
          VALUES (
            gen_random_uuid(),
            inserted_lead_id,
            phone_record->>'number',
            COALESCE(phone_record->>'type', 'mobile'),
            COALESCE((phone_record->>'priority')::integer, 1),
            COALESCE(phone_record->>'status', 'active'),
            COALESCE((phone_record->>'isPrimary')::boolean, false),
            now()
          );
        END LOOP;
      END IF;
      
      successful_inserts := successful_inserts + 1;
      
    EXCEPTION WHEN OTHERS THEN
      errors := errors || jsonb_build_object(
        'rowIndex', total_processed,
        'error', SQLERRM,
        'sqlstate', SQLSTATE,
        'timestamp', now()
      );
    END;
  END LOOP;
  
  -- Log completion
  PERFORM public.log_security_event(
    'csv_upload_completed',
    'leads',
    p_upload_history_id::text,
    jsonb_build_object(
      'user_id', current_user_id,
      'total_processed', total_processed,
      'successful_inserts', successful_inserts,
      'errors', jsonb_array_length(errors)
    )
  );
  
  RETURN jsonb_build_object(
    'success', successful_inserts > 0,
    'totalProcessed', total_processed,
    'successfulInserts', successful_inserts,
    'errors', errors,
    'errorCount', jsonb_array_length(errors),
    'message', format('Processed %s leads, %s successful inserts, %s errors', 
                     total_processed, successful_inserts, jsonb_array_length(errors))
  );
END;
$$;

-- Step 2: Enhance admin promotion function with stricter controls
DROP FUNCTION IF EXISTS public.promote_user_to_admin(uuid);

CREATE OR REPLACE FUNCTION public.promote_user_to_admin(
  target_user_id uuid,
  justification text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_role text;
  promoting_user_id uuid;
  target_user_email text;
BEGIN
  promoting_user_id := auth.uid();
  
  -- Verify promoter is authenticated
  IF promoting_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Authentication required for admin promotion'
    );
  END IF;
  
  -- Only existing admins can promote other users
  SELECT role INTO current_user_role 
  FROM public.user_roles 
  WHERE user_id = promoting_user_id AND role = 'admin'
  LIMIT 1;
  
  IF current_user_role IS NULL THEN
    -- Log unauthorized promotion attempt
    PERFORM public.log_security_event(
      'unauthorized_admin_promotion_attempt',
      'user_roles',
      target_user_id::text,
      jsonb_build_object(
        'attempted_by', promoting_user_id,
        'target_user', target_user_id,
        'justification', justification
      )
    );
    
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Only existing admins can promote users to admin'
    );
  END IF;
  
  -- Prevent self-promotion (security best practice)
  IF promoting_user_id = target_user_id THEN
    PERFORM public.log_security_event(
      'self_promotion_attempt',
      'user_roles',
      target_user_id::text,
      jsonb_build_object('user_id', promoting_user_id)
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Users cannot promote themselves'
    );
  END IF;
  
  -- Get target user email for logging
  SELECT email INTO target_user_email 
  FROM public.profiles 
  WHERE id = target_user_id;
  
  -- Add admin role if not exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Log successful promotion with detailed audit trail
  PERFORM public.log_security_event(
    'admin_promotion_successful',
    'user_roles',
    target_user_id::text,
    jsonb_build_object(
      'promoted_by', promoting_user_id,
      'promoted_user', target_user_id,
      'target_user_email', target_user_email,
      'justification', justification,
      'timestamp', now()
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User successfully promoted to admin',
    'promoted_by', promoting_user_id,
    'promoted_user', target_user_id,
    'timestamp', now()
  );
END;
$$;

-- Step 3: Create more restrictive RLS policies for sensitive operations
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Users can manage auto dial queue" ON public.auto_dial_queue;
DROP POLICY IF EXISTS "Users can view auto dial queue" ON public.auto_dial_queue;
DROP POLICY IF EXISTS "Users can manage auto dial sessions" ON public.auto_dial_sessions;
DROP POLICY IF EXISTS "Users can view auto dial sessions" ON public.auto_dial_sessions;

-- Create more restrictive auto dial policies
CREATE POLICY "Managers can manage auto dial queue"
ON public.auto_dial_queue
FOR ALL
TO authenticated
USING (public.user_has_manager_access())
WITH CHECK (public.user_has_manager_access());

CREATE POLICY "Managers can manage auto dial sessions"
ON public.auto_dial_sessions
FOR ALL
TO authenticated
USING (public.user_has_manager_access())
WITH CHECK (public.user_has_manager_access());

-- Step 4: Enhanced security monitoring
CREATE OR REPLACE FUNCTION public.log_failed_login_attempt(
  p_email text,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id, action, resource_type, resource_id, details, ip_address, user_agent
  ) VALUES (
    NULL, 'failed_login_attempt', 'auth', p_email,
    jsonb_build_object('email', p_email, 'timestamp', now()),
    p_ip_address, p_user_agent
  );
END;
$$;

-- Step 5: Create function to detect suspicious activity patterns
CREATE OR REPLACE FUNCTION public.detect_suspicious_activity(
  p_user_id uuid,
  p_time_window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  recent_events_count integer;
  suspicious_threshold integer := 10;
BEGIN
  -- Count recent security events for the user
  SELECT COUNT(*) INTO recent_events_count
  FROM public.security_audit_log
  WHERE user_id = p_user_id
  AND created_at > now() - (p_time_window_minutes || ' minutes')::interval
  AND action IN (
    'unauthorized_csv_upload_attempt',
    'unauthorized_admin_promotion_attempt',
    'rate_limit_exceeded',
    'failed_login_attempt'
  );
  
  RETURN recent_events_count > suspicious_threshold;
END;
$$;

-- Step 6: Add session security improvements
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token text NOT NULL,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  last_accessed_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  is_active boolean DEFAULT true
);

-- Enable RLS on user sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "Users can view their own sessions"
ON public.user_sessions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Only the user can invalidate their own sessions
CREATE POLICY "Users can update their own sessions"
ON public.user_sessions
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- System can create sessions
CREATE POLICY "System can create sessions"
ON public.user_sessions
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Step 7: Add function to revoke user sessions (for security incidents)
CREATE OR REPLACE FUNCTION public.revoke_all_user_sessions(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  revoked_count integer;
BEGIN
  -- Only admins can revoke other users' sessions
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Insufficient permissions to revoke sessions';
  END IF;
  
  -- Revoke all active sessions for the user
  UPDATE public.user_sessions
  SET is_active = false,
      last_accessed_at = now()
  WHERE user_id = p_user_id
  AND is_active = true;
  
  GET DIAGNOSTICS revoked_count = ROW_COUNT;
  
  -- Log session revocation
  PERFORM public.log_security_event(
    'sessions_revoked',
    'user_sessions',
    p_user_id::text,
    jsonb_build_object(
      'revoked_by', auth.uid(),
      'target_user', p_user_id,
      'sessions_revoked', revoked_count
    )
  );
  
  RETURN revoked_count;
END;
$$;