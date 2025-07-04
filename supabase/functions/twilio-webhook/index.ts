
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== TWILIO WEBHOOK START ===');
    console.log('📍 Request method:', req.method);
    console.log('📍 Request URL:', req.url);
    console.log('📍 Headers:', Object.fromEntries(req.headers.entries()));
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const formData = await req.formData()
    const from = formData.get('From')?.toString()
    const body = formData.get('Body')?.toString()
    const messageSid = formData.get('MessageSid')?.toString()
    const messageStatus = formData.get('MessageStatus')?.toString()
    
    console.log('📱 Incoming SMS Details:', { 
      from, 
      body: body?.substring(0, 100) + (body?.length > 100 ? '...' : ''), 
      messageSid,
      messageStatus
    });

    if (!from || !body) {
      console.error('❌ Missing required fields:', { from: !!from, body: !!body });
      return new Response('', { status: 400, headers: corsHeaders })
    }

    // Clean phone number format
    const cleanPhone = from.startsWith('+') ? from : `+${from}`;
    console.log('🔍 Looking up lead by phone number:', cleanPhone);

    // Find lead by phone number with retry logic for different formats
    let phoneData = null;
    const phoneFormats = [
      cleanPhone,
      from.replace('+1', ''),
      from.replace(/\D/g, ''),
      '+1' + from.replace(/\D/g, '')
    ];

    for (const phoneFormat of phoneFormats) {
      console.log('🔄 Trying phone format:', phoneFormat);
      
      const { data, error } = await supabase
        .from('phone_numbers')
        .select(`
          lead_id,
          leads (
            id,
            first_name,
            last_name,
            status,
            ai_takeover_enabled,
            ai_takeover_delay_minutes,
            ai_opt_in
          )
        `)
        .eq('number', phoneFormat)
        .single()

      if (!error && data?.leads) {
        phoneData = data;
        console.log('✅ Found lead with phone format:', phoneFormat);
        break;
      }
    }

    if (!phoneData?.leads) {
      console.error('❌ Lead not found for any phone format. Tried:', phoneFormats);
      return new Response('', { status: 404, headers: corsHeaders })
    }

    const lead = phoneData.leads;
    console.log('✅ Lead found:', {
      name: `${lead.first_name} ${lead.last_name}`,
      id: lead.id,
      currentStatus: lead.status,
      aiEnabled: lead.ai_opt_in,
      aiTakeover: lead.ai_takeover_enabled
    });

    // Insert the incoming message
    const { data: messageData, error: messageError } = await supabase
      .from('conversations')
      .insert({
        lead_id: lead.id,
        direction: 'in',
        body: body,
        twilio_message_id: messageSid,
        sms_status: messageStatus || 'delivered'
      })
      .select()
      .single()

    if (messageError) {
      console.error('❌ Error inserting message:', messageError);
      return new Response('', { status: 500, headers: corsHeaders })
    }

    console.log('💾 Message saved with ID:', messageData.id);

    // NEW: Track learning outcome for this reply
    await trackLearningOutcome(supabase, lead.id, messageData.id, body);

    // Update lead status to "engaged" if currently "new"
    if (lead.status === 'new') {
      console.log(`🔄 Updating lead status from "new" to "engaged" due to customer reply`);
      const { error: statusUpdateError } = await supabase
        .from('leads')
        .update({ status: 'engaged' })
        .eq('id', lead.id);

      if (statusUpdateError) {
        console.warn('⚠️ Failed to update lead status:', statusUpdateError);
      } else {
        console.log('✅ Lead status updated to "engaged"');
      }
    }

    // Handle AI takeover logic for incoming messages
    if (lead.ai_takeover_enabled && lead.ai_opt_in) {
      const delayMinutes = lead.ai_takeover_delay_minutes || 7;
      const deadlineTime = new Date(Date.now() + delayMinutes * 60 * 1000);
      
      console.log(`⏰ Setting AI takeover deadline: ${delayMinutes} minutes from now (${deadlineTime.toISOString()})`);
      
      // Set pending human response with deadline
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          pending_human_response: true,
          human_response_deadline: deadlineTime.toISOString(),
          last_reply_at: new Date().toISOString()
        })
        .eq('id', lead.id);

      if (updateError) {
        console.error('❌ Error setting AI takeover deadline:', updateError);
      } else {
        console.log('✅ AI takeover deadline set successfully');
      }
    } else if (lead.ai_opt_in) {
      // Traditional behavior - pause AI sequence for 24 hours
      const resumeTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      console.log(`⏸️ Pausing AI sequence until: ${resumeTime.toISOString()}`);
      
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          last_reply_at: new Date().toISOString(),
          ai_sequence_paused: true,
          ai_pause_reason: 'lead_responded',
          ai_resume_at: resumeTime.toISOString()
        })
        .eq('id', lead.id);

      if (updateError) {
        console.error('❌ Error updating lead reply status:', updateError);
      } else {
        console.log('✅ Lead reply status updated - AI paused for 24 hours');
      }
    } else {
      console.log('ℹ️ AI not enabled for this lead, skipping AI logic');
    }

    // Update conversation memory with the incoming message
    try {
      const { error: memoryError } = await supabase
        .from('conversation_memory')
        .upsert({
          lead_id: lead.id,
          memory_type: 'lead_response',
          content: `Lead replied: "${body}"`,
          confidence: 1.0,
          created_at: new Date().toISOString()
        });

      if (memoryError) {
        console.warn('⚠️ Failed to update conversation memory:', memoryError);
      } else {
        console.log('🧠 Conversation memory updated');
      }
    } catch (error) {
      console.warn('⚠️ Error updating conversation memory:', error);
    }

    console.log('✅ Webhook processed successfully');
    console.log('=== TWILIO WEBHOOK END ===');
    
    // Return empty response with 200 status to prevent Twilio auto-replies
    return new Response('', { 
      status: 200, 
      headers: corsHeaders
    })

  } catch (error) {
    console.error('💥 CRITICAL ERROR in webhook:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return new Response('', { status: 500, headers: corsHeaders })
  }
})

// NEW: Function to track learning outcomes when replies are received
async function trackLearningOutcome(supabase: any, leadId: string, messageId: string, replyBody: string) {
  try {
    console.log('📊 [LEARNING] Tracking reply outcome for lead:', leadId);

    // Get the most recent outbound AI message before this reply
    const { data: lastAIMessage } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', leadId)
      .eq('direction', 'out')
      .eq('ai_generated', true)
      .order('sent_at', { ascending: false })
      .limit(1)
      .single();

    if (lastAIMessage) {
      const responseTimeHours = (new Date().getTime() - new Date(lastAIMessage.sent_at).getTime()) / (1000 * 60 * 60);
      
      // Determine sentiment/outcome type
      const lowerReply = replyBody.toLowerCase();
      let outcomeType = 'response_received';
      
      if (lowerReply.includes('stop') || lowerReply.includes('unsubscribe')) {
        outcomeType = 'opt_out';
      } else if (lowerReply.includes('yes') || lowerReply.includes('interested') || lowerReply.includes('appointment')) {
        outcomeType = 'positive_response';
      } else if (lowerReply.includes('no') || lowerReply.includes('not interested')) {
        outcomeType = 'negative_response';
      }

      // Record the learning outcome
      await supabase.from('ai_learning_outcomes').insert({
        lead_id: leadId,
        message_id: lastAIMessage.id,
        outcome_type: outcomeType,
        days_to_outcome: Math.ceil(responseTimeHours / 24),
        message_characteristics: {
          message_content: lastAIMessage.body,
          message_length: lastAIMessage.body.length,
          sent_hour: new Date(lastAIMessage.sent_at).getHours(),
          response_time_hours: responseTimeHours
        },
        lead_characteristics: {
          reply_content: replyBody,
          reply_length: replyBody.length,
          reply_sentiment: outcomeType
        },
        seasonal_context: {
          hour: new Date().getHours(),
          day_of_week: new Date().getDay(),
          month: new Date().getMonth()
        }
      });

      // Record message feedback
      await supabase.from('ai_message_feedback').insert({
        lead_id: leadId,
        conversation_id: lastAIMessage.id,
        message_content: lastAIMessage.body,
        feedback_type: outcomeType.includes('positive') ? 'positive' : 
                      outcomeType.includes('negative') ? 'negative' : 'neutral',
        response_received: true,
        response_time_hours: responseTimeHours,
        conversion_outcome: outcomeType
      });

      // Update message analytics
      await supabase.from('ai_message_analytics').insert({
        lead_id: leadId,
        message_content: lastAIMessage.body,
        message_stage: 'follow_up',
        sent_at: lastAIMessage.sent_at,
        responded_at: new Date().toISOString(),
        response_time_hours: responseTimeHours,
        hour_of_day: new Date(lastAIMessage.sent_at).getHours(),
        day_of_week: new Date(lastAIMessage.sent_at).getDay()
      });

      console.log(`✅ [LEARNING] Recorded outcome: ${outcomeType}, Response time: ${responseTimeHours.toFixed(2)}h`);
    }

  } catch (error) {
    console.error('❌ [LEARNING] Error tracking outcome:', error);
  }
}
