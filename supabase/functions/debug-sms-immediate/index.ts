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
    console.log('🔍 [DEBUG-SMS] Starting immediate SMS debug test...');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get Twilio credentials
    const { data: settings, error: settingsError } = await supabaseClient
      .from('settings')
      .select('key, value')
      .in('key', ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER']);

    if (settingsError) {
      throw new Error(`Settings error: ${settingsError.message}`);
    }

    const twilioSettings = {};
    settings?.forEach(s => {
      twilioSettings[s.key] = s.value;
    });

    console.log('📋 [DEBUG-SMS] Twilio settings check:', {
      hasAccountSid: !!twilioSettings['TWILIO_ACCOUNT_SID'],
      hasAuthToken: !!twilioSettings['TWILIO_AUTH_TOKEN'], 
      hasPhoneNumber: !!twilioSettings['TWILIO_PHONE_NUMBER']
    });

    // Try to call send-sms function with a test message
    console.log('📤 [DEBUG-SMS] Attempting direct SMS send...');
    
    const { data: smsResult, error: smsError } = await supabaseClient.functions.invoke('send-sms', {
      body: {
        to: '+13345640639', // Test lead phone number from query above
        body: 'DEBUG TEST: SMS pipeline diagnostic - please ignore',
        conversationId: null
      }
    });

    console.log('📬 [DEBUG-SMS] SMS function response:', {
      data: smsResult,
      error: smsError
    });

    return new Response(JSON.stringify({
      success: true,
      twilioSettings: Object.keys(twilioSettings),
      smsResult,
      smsError,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ [DEBUG-SMS] Test failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});