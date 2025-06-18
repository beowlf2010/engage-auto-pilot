
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
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const formData = await req.formData()
    const from = formData.get('From')?.toString()
    const body = formData.get('Body')?.toString()
    const messageSid = formData.get('MessageSid')?.toString()
    
    console.log('📱 Incoming SMS:', { from, body: body?.substring(0, 50) + '...', messageSid });

    if (!from || !body) {
      console.error('❌ Missing required fields:', { from: !!from, body: !!body });
      return new Response('Missing required fields', { status: 400, headers: corsHeaders })
    }

    // Find lead by phone number
    console.log('🔍 Looking up lead by phone number:', from);
    const { data: phoneData, error: phoneError } = await supabase
      .from('phone_numbers')
      .select(`
        lead_id,
        leads (
          id,
          first_name,
          last_name,
          ai_takeover_enabled,
          ai_takeover_delay_minutes
        )
      `)
      .eq('number', from)
      .single()

    if (phoneError || !phoneData) {
      console.error('❌ Lead not found for phone:', from, phoneError);
      return new Response('Lead not found', { status: 404, headers: corsHeaders })
    }

    const lead = phoneData.leads
    console.log('✅ Lead found:', lead.first_name, lead.last_name, 'ID:', lead.id);

    // Insert the incoming message
    const { data: messageData, error: messageError } = await supabase
      .from('conversations')
      .insert({
        lead_id: lead.id,
        direction: 'in',
        body: body,
        twilio_message_id: messageSid,
        sms_status: 'delivered'
      })
      .select()
      .single()

    if (messageError) {
      console.error('❌ Error inserting message:', messageError);
      return new Response('Error saving message', { status: 500, headers: corsHeaders })
    }

    console.log('💾 Message saved with ID:', messageData.id);

    // Handle AI takeover logic for incoming messages
    if (lead.ai_takeover_enabled) {
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
    } else {
      // Traditional behavior - pause AI sequence for 24 hours
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          last_reply_at: new Date().toISOString(),
          ai_sequence_paused: true,
          ai_pause_reason: 'lead_responded',
          ai_resume_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', lead.id);

      if (updateError) {
        console.error('❌ Error updating lead reply status:', updateError);
      } else {
        console.log('✅ Lead reply status updated - AI paused for 24 hours');
      }
    }

    // Update conversation memory with the incoming message
    try {
      const { error: memoryError } = await supabase
        .from('conversation_memory')
        .upsert({
          lead_id: lead.id,
          memory_type: 'recent_interaction',
          content: `Lead replied: "${body}"`,
          confidence: 1.0
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
    return new Response('OK', { status: 200, headers: corsHeaders })

  } catch (error) {
    console.error('💥 CRITICAL ERROR in webhook:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return new Response('Internal error', { status: 500, headers: corsHeaders })
  }
})
