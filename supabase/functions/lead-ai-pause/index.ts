// supabase/functions/lead-ai-pause/index.ts
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting storage
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Input validation and sanitization
function validateInput(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Invalid request body');
    return { isValid: false, errors };
  }
  
  if (!data.leadId || typeof data.leadId !== 'string') {
    errors.push('leadId is required and must be a string');
  } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.leadId)) {
    errors.push('leadId must be a valid UUID');
  }
  
  if (data.reason && typeof data.reason !== 'string') {
    errors.push('reason must be a string');
  } else if (data.reason && data.reason.length > 500) {
    errors.push('reason cannot exceed 500 characters');
  }
  
  return { isValid: errors.length === 0, errors };
}

// Rate limiting check
function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 10;
  
  const current = rateLimitMap.get(identifier);
  
  if (!current || now > current.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= maxRequests) {
    return false;
  }
  
  current.count++;
  return true;
}

// Security logging
async function logSecurityEvent(supabase: any, event: string, details: any, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium') {
  try {
    await supabase.from('security_audit_log').insert({
      action: event,
      resource_type: 'edge_function',
      details: { function: 'lead-ai-pause', ...details },
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let requestData: any = null;
  
  try {
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    // Get client IP for rate limiting and logging
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    // Rate limiting
    if (!checkRateLimit(clientIP)) {
      await logSecurityEvent(supabase, 'rate_limit_exceeded', { 
        ip: clientIP, 
        endpoint: 'lead-ai-pause'
      }, 'high');
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Rate limit exceeded. Please try again later.'
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      await logSecurityEvent(supabase, 'unauthorized_access_attempt', { 
        ip: clientIP, 
        endpoint: 'lead-ai-pause'
      }, 'high');
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      await logSecurityEvent(supabase, 'invalid_authentication', { 
        ip: clientIP, 
        error: authError?.message 
      }, 'high');
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid authentication'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse and validate input
    try {
      requestData = await req.json();
    } catch (parseError) {
      await logSecurityEvent(supabase, 'invalid_json_input', { 
        ip: clientIP, 
        user_id: user.id,
        error: parseError.message 
      }, 'medium');
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid JSON in request body'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const validation = validateInput(requestData);
    if (!validation.isValid) {
      await logSecurityEvent(supabase, 'input_validation_failed', { 
        ip: clientIP, 
        user_id: user.id,
        errors: validation.errors,
        input: requestData
      }, 'medium');
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Input validation failed',
        details: validation.errors
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { leadId, reason } = requestData;

    console.log('⏸️ [AI PAUSE] Pausing AI for lead:', leadId);

    // Verify user has permission to modify this lead
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const hasPermission = userRoles?.some(r => ['admin', 'manager', 'sales'].includes(r.role));
    if (!hasPermission) {
      await logSecurityEvent(supabase, 'unauthorized_lead_modification', { 
        user_id: user.id, 
        lead_id: leadId 
      }, 'high');
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Insufficient permissions'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update lead to pause AI
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        ai_stage: 'paused',
        next_ai_send_at: null,
        ai_strategy_last_updated: new Date().toISOString()
      })
      .eq('id', leadId);

    if (updateError) {
      await logSecurityEvent(supabase, 'database_operation_failed', { 
        user_id: user.id, 
        lead_id: leadId, 
        operation: 'update_lead',
        error: updateError.message 
      }, 'high');
      throw updateError;
    }

    // Cancel scheduled messages
    await supabase
      .from('ai_message_schedule')
      .update({ status: 'cancelled' })
      .eq('lead_id', leadId)
      .eq('status', 'scheduled');

    // Log pause action
    await supabase
      .from('ai_conversation_notes')
      .insert({
        lead_id: leadId,
        note_type: 'ai_sequence_paused',
        note_content: `AI messaging paused. Reason: ${reason || 'Manual pause'}`
      });

    // Log successful operation
    await logSecurityEvent(supabase, 'ai_sequence_paused', { 
      user_id: user.id, 
      lead_id: leadId,
      reason: reason || 'Manual pause',
      execution_time_ms: Date.now() - startTime
    }, 'low');

    return new Response(JSON.stringify({
      success: true,
      leadId,
      message: 'AI messaging paused successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ [AI PAUSE] Error:', error);
    
    // Log error with context
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    await logSecurityEvent(supabase, 'function_execution_error', { 
      error: error.message,
      stack: error.stack,
      request_data: requestData,
      execution_time_ms: Date.now() - startTime
    }, 'critical');
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to pause AI messaging'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});