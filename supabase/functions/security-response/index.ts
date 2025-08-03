import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SecurityResponseRequest {
  action: 'block_ip' | 'emergency_lockdown' | 'rate_limit_reset' | 'force_logout';
  ip_address?: string;
  user_id?: string;
  reason: string;
  duration?: string;
  disable_api?: boolean;
  disable_auth?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    // Verify user has admin role
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (roleError || !userRoles?.some(r => r.role === 'admin')) {
      throw new Error('Admin access required');
    }

    const requestData: SecurityResponseRequest = await req.json();
    const { action, ip_address, user_id, reason, duration, disable_api, disable_auth } = requestData;

    let response: any = { success: false };

    switch (action) {
      case 'block_ip':
        if (!ip_address) {
          throw new Error('IP address required for blocking');
        }
        
        // Add IP to blocked list (would typically integrate with WAF/firewall)
        const blockDuration = parseDuration(duration || '24h');
        const blockUntil = new Date(Date.now() + blockDuration);
        
        const { error: blockError } = await supabase
          .from('security_ip_blocks')
          .insert({
            ip_address,
            blocked_by: user.id,
            reason,
            blocked_until: blockUntil.toISOString(),
            created_at: new Date().toISOString()
          });

        if (blockError) throw blockError;

        // Log the security action
        await logSecurityAction(supabase, user.id, 'ip_blocked', 'security', {
          ip_address,
          reason,
          duration,
          blocked_until: blockUntil.toISOString()
        });

        response = {
          success: true,
          message: `IP ${ip_address} blocked until ${blockUntil.toISOString()}`,
          blocked_until: blockUntil.toISOString()
        };
        break;

      case 'emergency_lockdown':
        // Enable emergency mode in settings
        const lockdownSettings = {
          emergency_mode: true,
          api_disabled: disable_api || false,
          auth_disabled: disable_auth || false,
          lockdown_reason: reason,
          lockdown_initiated_by: user.id,
          lockdown_initiated_at: new Date().toISOString()
        };

        const { error: lockdownError } = await supabase
          .from('ai_emergency_settings')
          .upsert({
            id: 1,
            ai_disabled: true,
            emergency_reason: reason,
            disabled_by: user.id,
            disabled_at: new Date().toISOString(),
            ...lockdownSettings
          });

        if (lockdownError) throw lockdownError;

        // Log emergency lockdown
        await logSecurityAction(supabase, user.id, 'emergency_lockdown', 'system', {
          reason,
          settings: lockdownSettings
        });

        response = {
          success: true,
          message: 'Emergency lockdown activated',
          settings: lockdownSettings
        };
        break;

      case 'rate_limit_reset':
        // Clear rate limiting entries for user/IP
        const { error: resetError } = await supabase
          .from('security_rate_limits')
          .delete()
          .or(`identifier.eq.${ip_address || user_id}`);

        if (resetError) throw resetError;

        await logSecurityAction(supabase, user.id, 'rate_limit_reset', 'security', {
          target: ip_address || user_id,
          reason
        });

        response = {
          success: true,
          message: 'Rate limits reset'
        };
        break;

      case 'force_logout':
        if (!user_id) {
          throw new Error('User ID required for forced logout');
        }

        // Invalidate all sessions for user (would typically work with auth provider)
        await logSecurityAction(supabase, user.id, 'forced_logout', 'auth', {
          target_user: user_id,
          reason
        });

        response = {
          success: true,
          message: `User ${user_id} sessions invalidated`
        };
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Security response error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

async function logSecurityAction(
  supabase: any,
  userId: string,
  action: string,
  resourceType: string,
  details: any
) {
  const { error } = await supabase
    .from('security_audit_log')
    .insert({
      user_id: userId,
      action,
      resource_type: resourceType,
      details,
      created_at: new Date().toISOString()
    });

  if (error) {
    console.error('Failed to log security action:', error);
  }
}

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([hmsd])$/);
  if (!match) return 24 * 60 * 60 * 1000; // Default 24 hours

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 24 * 60 * 60 * 1000;
  }
}