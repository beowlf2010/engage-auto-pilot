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

  try {
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    const { leadId, sequenceType = 'new_lead', tonePreference = 'friendly', messageType = 'sms', customStartDelay = 0 }: StartAIRequest = await req.json();

    console.log('🚀 [AI START] Starting AI sequence for lead:', leadId);

    // TODO: Validate user permissions
    // TODO: Check if lead exists and is eligible for AI
    // TODO: Integrate with existing lead validation system

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