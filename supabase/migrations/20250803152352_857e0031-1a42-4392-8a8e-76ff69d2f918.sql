-- Security Enhancement Phase 2: API Key Security and Monitoring
-- Create missing security_rate_limits table and API key backup system

-- First create the security_rate_limits table that's being referenced
CREATE TABLE IF NOT EXISTS public.security_rate_limits (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    operation_type TEXT NOT NULL,
    client_ip TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on security_rate_limits
ALTER TABLE public.security_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS policies for security_rate_limits (admin only access)
CREATE POLICY "Admins can manage security rate limits" 
ON public.security_rate_limits 
FOR ALL 
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_rate_limits_user_type ON public.security_rate_limits(user_id, operation_type);
CREATE INDEX IF NOT EXISTS idx_security_rate_limits_created_at ON public.security_rate_limits(created_at);

-- Table for storing API key backups during rotations
CREATE TABLE IF NOT EXISTS public.api_key_backups (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    original_key TEXT NOT NULL,
    original_value TEXT NOT NULL,
    rotation_reason TEXT NOT NULL,
    rotated_by UUID NOT NULL,
    emergency_rotation BOOLEAN NOT NULL DEFAULT false,
    backup_created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    restored_at TIMESTAMP WITH TIME ZONE,
    restored_by UUID,
    backup_expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '90 days'),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on api_key_backups
ALTER TABLE public.api_key_backups ENABLE ROW LEVEL SECURITY;

-- RLS policies for api_key_backups (admin only access)
CREATE POLICY "Admins can manage API key backups" 
ON public.api_key_backups 
FOR ALL 
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

-- Enhanced function to check security rate limits with better performance
CREATE OR REPLACE FUNCTION public.check_security_rate_limit(
    p_user_id UUID,
    p_operation_type TEXT,
    p_max_per_hour INTEGER DEFAULT 10,
    p_max_per_day INTEGER DEFAULT 50
) RETURNS BOOLEAN AS $$
DECLARE
    hourly_count INTEGER;
    daily_count INTEGER;
    one_hour_ago TIMESTAMP WITH TIME ZONE;
    one_day_ago TIMESTAMP WITH TIME ZONE;
BEGIN
    one_hour_ago := now() - INTERVAL '1 hour';
    one_day_ago := now() - INTERVAL '1 day';
    
    -- Check hourly limit
    SELECT COUNT(*) INTO hourly_count
    FROM public.security_rate_limits
    WHERE user_id = p_user_id
        AND operation_type = p_operation_type
        AND created_at >= one_hour_ago;
    
    IF hourly_count >= p_max_per_hour THEN
        RETURN FALSE;
    END IF;
    
    -- Check daily limit
    SELECT COUNT(*) INTO daily_count
    FROM public.security_rate_limits
    WHERE user_id = p_user_id
        AND operation_type = p_operation_type
        AND created_at >= one_day_ago;
    
    IF daily_count >= p_max_per_day THEN
        RETURN FALSE;
    END IF;
    
    -- Record this operation
    INSERT INTO public.security_rate_limits (
        user_id,
        operation_type,
        client_ip,
        metadata
    ) VALUES (
        p_user_id,
        p_operation_type,
        'server-function',
        jsonb_build_object(
            'hourly_count', hourly_count + 1,
            'daily_count', daily_count + 1,
            'timestamp', now()
        )
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired API key backups
CREATE OR REPLACE FUNCTION public.cleanup_expired_api_key_backups()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.api_key_backups
    WHERE backup_expires_at < now()
        AND restored_at IS NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log cleanup operation
    INSERT INTO public.security_audit_log (
        user_id,
        action,
        resource_type,
        details
    ) VALUES (
        NULL,
        'api_key_backup_cleanup',
        'system_maintenance',
        jsonb_build_object(
            'deleted_count', deleted_count,
            'cleanup_date', now()
        )
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_api_key_backups_expires_at ON public.api_key_backups(backup_expires_at);
CREATE INDEX IF NOT EXISTS idx_api_key_backups_rotated_by ON public.api_key_backups(rotated_by);
CREATE INDEX IF NOT EXISTS idx_api_key_backups_emergency ON public.api_key_backups(emergency_rotation, backup_created_at);

-- Add updated_at trigger for api_key_backups
CREATE TRIGGER update_api_key_backups_updated_at
    BEFORE UPDATE ON public.api_key_backups
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create a view for security dashboard metrics
CREATE OR REPLACE VIEW public.security_dashboard_metrics AS
SELECT 
    (SELECT COUNT(*) FROM public.security_rate_limits WHERE created_at >= now() - INTERVAL '1 hour') as hourly_operations,
    (SELECT COUNT(*) FROM public.security_rate_limits WHERE created_at >= now() - INTERVAL '1 day') as daily_operations,
    (SELECT COUNT(*) FROM public.api_key_backups WHERE backup_created_at >= now() - INTERVAL '7 days') as weekly_rotations,
    (SELECT COUNT(*) FROM public.api_key_backups WHERE emergency_rotation = true AND backup_created_at >= now() - INTERVAL '30 days') as emergency_rotations_month,
    (SELECT COUNT(*) FROM public.security_audit_log WHERE action LIKE '%suspicious%' AND created_at >= now() - INTERVAL '24 hours') as suspicious_events_today,
    (SELECT COUNT(*) FROM public.security_audit_log WHERE action LIKE '%rate_limit%' AND created_at >= now() - INTERVAL '24 hours') as rate_limit_hits_today;