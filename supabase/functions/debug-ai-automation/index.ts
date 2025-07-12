import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 [DEBUG] Starting AI automation debugging...');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Step 1: Check if we can get leads
    console.log('🔍 [DEBUG] Step 1: Checking leads query...');
    const now = new Date();
    const { data: leads, error: leadsError } = await supabaseClient
      .from('leads')
      .select('id, first_name, vehicle_interest, ai_messages_sent, created_at, next_ai_send_at')
      .eq('ai_opt_in', true)
      .eq('ai_sequence_paused', false)
      .not('next_ai_send_at', 'is', null)
      .lte('next_ai_send_at', now.toISOString())
      .limit(1);

    if (leadsError) {
      console.error('❌ [DEBUG] Leads query error:', leadsError);
      return new Response(JSON.stringify({
        step: 'leads_query',
        error: leadsError,
        success: false
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('✅ [DEBUG] Found leads:', leads?.length || 0);

    if (!leads || leads.length === 0) {
      return new Response(JSON.stringify({
        step: 'leads_query',
        message: 'No leads found to process',
        totalLeads: 0,
        success: true
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const lead = leads[0];
    console.log('🔍 [DEBUG] Step 2: Processing lead:', lead.id);

    // Step 2: Get phone number
    const { data: leadWithPhone, error: phoneError } = await supabaseClient
      .from('leads')
      .select(`
        id,
        first_name,
        last_name,
        phone_numbers (
          number,
          is_primary
        )
      `)
      .eq('id', lead.id)
      .single();

    if (phoneError) {
      console.error('❌ [DEBUG] Phone query error:', phoneError);
      return new Response(JSON.stringify({
        step: 'phone_query',
        leadId: lead.id,
        error: phoneError,
        success: false
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const phoneNumbers = Array.isArray(leadWithPhone.phone_numbers) ? leadWithPhone.phone_numbers : [];
    const primaryPhone = phoneNumbers.find((p: any) => p.is_primary)?.number || phoneNumbers[0]?.number;

    console.log('✅ [DEBUG] Phone found:', !!primaryPhone);

    if (!primaryPhone) {
      return new Response(JSON.stringify({
        step: 'phone_validation',
        leadId: lead.id,
        error: 'No phone number found',
        phoneNumbers: phoneNumbers,
        success: false
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Step 3: Create conversation
    console.log('🔍 [DEBUG] Step 3: Creating conversation...');
    const testMessage = "Hello! This is a test message from the debug function.";
    
    const { data: conversation, error: conversationError } = await supabaseClient
      .from('conversations')
      .insert({
        lead_id: lead.id,
        body: testMessage,
        direction: 'out',
        sent_at: new Date().toISOString(),
        ai_generated: true,
        sms_status: 'pending'
      })
      .select()
      .single();

    if (conversationError) {
      console.error('❌ [DEBUG] Conversation creation error:', conversationError);
      return new Response(JSON.stringify({
        step: 'conversation_creation',
        leadId: lead.id,
        error: conversationError,
        success: false
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('✅ [DEBUG] Conversation created:', conversation.id);

    // Step 4: Test SMS function call
    console.log('🔍 [DEBUG] Step 4: Testing SMS function call...');
    
    const smsPayload = {
      to: primaryPhone,
      body: testMessage,
      conversationId: conversation.id
    };

    console.log('🔍 [DEBUG] SMS payload:', smsPayload);

    const { data: smsResponse, error: smsError } = await supabaseClient.functions.invoke('send-sms', {
      body: smsPayload
    });

    console.log('🔍 [DEBUG] SMS response:', { smsResponse, smsError });

    return new Response(JSON.stringify({
      step: 'complete',
      leadId: lead.id,
      conversationId: conversation.id,
      phoneNumber: primaryPhone,
      smsPayload,
      smsResponse,
      smsError,
      success: !smsError && smsResponse?.success,
      timestamp: new Date().toISOString()
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('❌ [DEBUG] Critical error:', error);
    return new Response(JSON.stringify({
      step: 'critical_error',
      error: error.message,
      stack: error.stack,
      success: false
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});