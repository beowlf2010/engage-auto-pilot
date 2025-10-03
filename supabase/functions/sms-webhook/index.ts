import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Normalize phone number to E.164 format (+1XXXXXXXXXX)
 * This must match the normalization in src/utils/phoneUtils.ts
 */
function normalizePhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  if (!digitsOnly) return null;
  
  // Handle different formats
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  } else if (digitsOnly.length === 11) {
    return `+${digitsOnly}`;
  } else if (digitsOnly.length > 11) {
    return `+${digitsOnly}`;
  } else {
    return phone.startsWith('+') ? phone : `+${digitsOnly}`;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    console.log('📨 [SMS WEBHOOK] Received inbound SMS:', body);

    // Extract phone number and message from webhook payload
    // Adjust these fields based on your SMS provider (Twilio, Bandwidth, etc.)
    const fromPhone = body.From || body.from || body.phoneNumber;
    const messageBody = body.Body || body.body || body.message;
    const toPhone = body.To || body.to;

    if (!fromPhone || !messageBody) {
      console.error('❌ [SMS WEBHOOK] Missing required fields:', { fromPhone, messageBody });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: from phone or message body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize the phone number for thread matching
    const normalizedPhone = normalizePhoneNumber(fromPhone);
    console.log('📞 [SMS WEBHOOK] Normalized phone:', { original: fromPhone, normalized: normalizedPhone });

    if (!normalizedPhone) {
      console.error('❌ [SMS WEBHOOK] Failed to normalize phone number:', fromPhone);
      return new Response(
        JSON.stringify({ error: 'Invalid phone number format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find lead by phone number
    const { data: phoneNumbers, error: phoneError } = await supabase
      .from('phone_numbers')
      .select('lead_id')
      .eq('number', normalizedPhone)
      .limit(1);

    if (phoneError) {
      console.error('❌ [SMS WEBHOOK] Error finding lead by phone:', phoneError);
      throw phoneError;
    }

    let leadId: string | null = phoneNumbers?.[0]?.lead_id || null;

    // If no lead found, create a new lead for this phone number
    if (!leadId) {
      console.log('🆕 [SMS WEBHOOK] Creating new lead for phone:', normalizedPhone);
      
      const { data: newLead, error: leadError } = await supabase
        .from('leads')
        .insert({
          first_name: 'Unknown',
          last_name: 'Contact',
          source: 'SMS Inbound',
          status: 'new'
        })
        .select()
        .single();

      if (leadError) {
        console.error('❌ [SMS WEBHOOK] Error creating lead:', leadError);
        throw leadError;
      }

      leadId = newLead.id;

      // Create phone number record
      await supabase
        .from('phone_numbers')
        .insert({
          lead_id: leadId,
          number: normalizedPhone,
          is_primary: true,
          type: 'mobile'
        });

      console.log('✅ [SMS WEBHOOK] Created new lead:', leadId);
    }

    // Insert the conversation with normalized phone_number for thread matching
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        lead_id: leadId,
        phone_number: normalizedPhone, // Critical for thread matching
        body: messageBody,
        direction: 'in',
        sent_at: new Date().toISOString(),
        sms_status: 'received'
      })
      .select()
      .single();

    if (convError) {
      console.error('❌ [SMS WEBHOOK] Error creating conversation:', convError);
      throw convError;
    }

    console.log('✅ [SMS WEBHOOK] Successfully created conversation:', {
      conversationId: conversation.id,
      leadId,
      normalizedPhone,
      threadMatched: true
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        conversationId: conversation.id,
        leadId,
        threadMatched: true 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ [SMS WEBHOOK] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
