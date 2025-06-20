
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

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
          memory_type: 'conversation_context',
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
    
    // Return empty response with 204 status - no content for customer
    return new Response('', { 
      status: 204, 
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain'
      }
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
