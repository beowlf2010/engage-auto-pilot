// supabase/functions/lead-ai-start/index.ts
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StartAIRequest {
  leadId: string;
  sequenceType?: 'new_lead' | 'followup' | 'service' | 'post_sale';
  tonePreference?: 'friendly' | 'urgent' | 'budget';
  messageType?: 'sms' | 'email' | 'both';
  customStartDelay?: number; // minutes
}

// Rate limiting storage
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Input validation
function validateStartAIRequest(data: any): { isValid: boolean; errors: string[] } {
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
  
  const validSequenceTypes = ['new_lead', 'followup', 'service', 'post_sale'];
  if (data.sequenceType && !validSequenceTypes.includes(data.sequenceType)) {
    errors.push('sequenceType must be one of: ' + validSequenceTypes.join(', '));
  }
  
  const validTones = ['friendly', 'urgent', 'budget'];
  if (data.tonePreference && !validTones.includes(data.tonePreference)) {
    errors.push('tonePreference must be one of: ' + validTones.join(', '));
  }
  
  const validMessageTypes = ['sms', 'email', 'both'];
  if (data.messageType && !validMessageTypes.includes(data.messageType)) {
    errors.push('messageType must be one of: ' + validMessageTypes.join(', '));
  }
  
  if (data.customStartDelay !== undefined) {
    if (typeof data.customStartDelay !== 'number' || data.customStartDelay < 0 || data.customStartDelay > 1440) {
      errors.push('customStartDelay must be a number between 0 and 1440 (minutes)');
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

// Rate limiting check
function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 5; // Lower limit for AI start operations
  
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
      details: { function: 'lead-ai-start', ...details },
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

interface AISequenceConfig {
  sequenceType: string;
  totalDays: number;
  messages: Array<{
    day: number;
    messageType: 'sms' | 'email';
    template: string;
    tone: string;
  }>;
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
        endpoint: 'lead-ai-start'
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
        endpoint: 'lead-ai-start'
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

    const validation = validateStartAIRequest(requestData);
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

    const { leadId, sequenceType = 'new_lead', tonePreference = 'friendly', messageType = 'sms', customStartDelay = 0 }: StartAIRequest = requestData;

    console.log('🚀 [AI START] Starting AI sequence for lead:', leadId);

    // Verify user has permission to start AI sequences
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const hasPermission = userRoles?.some(r => ['admin', 'manager', 'sales'].includes(r.role));
    if (!hasPermission) {
      await logSecurityEvent(supabase, 'unauthorized_ai_start_attempt', { 
        user_id: user.id, 
        lead_id: leadId 
      }, 'high');
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Insufficient permissions to start AI sequences'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch lead data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select(`
        id,
        first_name,
        last_name,
        vehicle_interest,
        source,
        ai_opt_in,
        ai_stage,
        next_ai_send_at,
        created_at
      `)
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Lead not found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if lead has opted in to AI
    if (!lead.ai_opt_in) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Lead has not opted in to AI messaging'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if AI is already active
    if (lead.ai_stage === 'active' && lead.next_ai_send_at) {
      return new Response(JSON.stringify({
        success: false,
        error: 'AI messaging already active for this lead',
        nextSendAt: lead.next_ai_send_at
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Calculate first message send time
    const now = new Date();
    const firstSendAt = new Date(now.getTime() + (customStartDelay * 60 * 1000));
    
    // If no custom delay, use smart scheduling (avoid lunch/dinner hours)
    if (customStartDelay === 0) {
      const hour = firstSendAt.getHours();
      if (hour < 9) {
        firstSendAt.setHours(9, 0, 0, 0); // Start at 9 AM
      } else if (hour >= 19) {
        firstSendAt.setDate(firstSendAt.getDate() + 1);
        firstSendAt.setHours(9, 0, 0, 0); // Next day at 9 AM
      }
    }

    // Get sequence configuration
    const sequenceConfig = getSequenceConfig(sequenceType, tonePreference);
    
    // Generate first message
    const firstMessage = await generateMessage(lead, sequenceConfig.messages[0], sequenceConfig);

    // Update lead with AI activation
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        ai_stage: 'active',
        next_ai_send_at: firstSendAt.toISOString(),
        ai_message_preview: firstMessage,
        message_intensity: tonePreference,
        ai_strategy_last_updated: now.toISOString()
      })
      .eq('id', leadId);

    if (updateError) {
      console.error('❌ [AI START] Error updating lead:', updateError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to activate AI messaging'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create AI message schedule entry
    const { error: scheduleError } = await supabase
      .from('ai_message_schedule')
      .insert({
        lead_id: leadId,
        sequence_type: sequenceType,
        sequence_day: 0,
        tone_variant: tonePreference,
        message_type: messageType,
        template_content: firstMessage,
        scheduled_send_at: firstSendAt.toISOString(),
        status: 'scheduled'
      });

    if (scheduleError) {
      console.warn('⚠️ [AI START] Could not create schedule entry:', scheduleError);
    }

    // Log AI activation
    const { error: logError } = await supabase
      .from('ai_conversation_notes')
      .insert({
        lead_id: leadId,
        note_type: 'ai_sequence_started',
        note_content: `AI ${sequenceType} sequence started with ${tonePreference} tone. First message scheduled for ${firstSendAt.toISOString()}.`
      });

    if (logError) {
      console.warn('⚠️ [AI START] Could not log activation:', logError);
    }

    console.log('✅ [AI START] AI activated for lead:', leadId);

    // Log successful operation
    await logSecurityEvent(supabase, 'ai_sequence_started', { 
      user_id: user.id, 
      lead_id: leadId,
      sequence_type: sequenceType,
      tone_preference: tonePreference,
      message_type: messageType,
      execution_time_ms: Date.now() - startTime
    }, 'low');

    return new Response(JSON.stringify({
      success: true,
      leadId,
      sequenceType,
      tonePreference,
      messageType,
      nextSendAt: firstSendAt.toISOString(),
      messagePreview: firstMessage,
      totalMessages: sequenceConfig.totalDays,
      message: 'AI messaging sequence started successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ [AI START] Unexpected error:', error);
    
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
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function getSequenceConfig(sequenceType: string, tone: string): AISequenceConfig {
  // TODO: Load from database or configuration
  // TODO: Add A/B testing variants
  // TODO: Integrate with template library
  
  const baseConfig = {
    new_lead: { totalDays: 84, messageCount: 10 },
    followup: { totalDays: 42, messageCount: 6 },
    service: { totalDays: 21, messageCount: 4 },
    post_sale: { totalDays: 365, messageCount: 12 }
  };

  const config = baseConfig[sequenceType as keyof typeof baseConfig] || baseConfig.new_lead;

  return {
    sequenceType,
    totalDays: config.totalDays,
    messages: Array.from({ length: config.messageCount }, (_, i) => ({
      day: i === 0 ? 0 : Math.floor((config.totalDays / config.messageCount) * i),
      messageType: 'sms' as const,
      template: `Template ${i + 1} for ${sequenceType}`,
      tone
    }))
  };
}

async function generateMessage(lead: any, messageConfig: any, sequenceConfig: AISequenceConfig): Promise<string> {
  // TODO: Integrate with OpenAI API for dynamic message generation
  // TODO: Use lead data for personalization
  // TODO: Apply compliance checks
  
  const templates = {
    friendly: `Hi {{lead_first}}! 😎 Hope you're doing well. Just wanted to follow up on that {{vehicle}} 🚗 you were interested in.`,
    urgent: `{{lead_first}}! URGENT update on your {{vehicle}} 🚗 - don't miss out on current incentives!`,
    budget: `Hi {{lead_first}}! Great news - that {{vehicle}} 🚗 can fit your budget with our current financing options!`
  };

  let message = templates[messageConfig.tone as keyof typeof templates] || templates.friendly;
  
  // Replace variables
  message = message.replace(/\{\{lead_first\}\}/g, lead.first_name || 'there');
  message = message.replace(/\{\{vehicle\}\}/g, lead.vehicle_interest || 'vehicle you were interested in');
  
  return message;
}