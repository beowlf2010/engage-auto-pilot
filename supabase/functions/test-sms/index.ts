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
    console.log('=== TEST SMS FUNCTION START ===');
    const { to, message } = await req.json()
    
    if (!to || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone number and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📱 Testing SMS to ${to}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get Twilio credentials from database
    const { data: settings, error } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'])

    if (error) {
      console.error('❌ Database error:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch Twilio credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const settingsMap: Record<string, string> = {}
    settings?.forEach(setting => {
      settingsMap[setting.key] = setting.value
    })

    const accountSid = settingsMap['TWILIO_ACCOUNT_SID']
    const authToken = settingsMap['TWILIO_AUTH_TOKEN']
    const phoneNumber = settingsMap['TWILIO_PHONE_NUMBER']

    if (!accountSid || !authToken || !phoneNumber) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing Twilio credentials in database',
          hasAccountSid: !!accountSid,
          hasAuthToken: !!authToken,
          hasPhoneNumber: !!phoneNumber
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Twilio credentials found:', {
      accountSidStart: accountSid.substring(0, 6) + '...',
      phoneNumber: phoneNumber
    });

    // Send test SMS via Twilio
    const payload = new URLSearchParams({
      To: to,
      From: phoneNumber,
      Body: message
    })

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: payload
    })

    const result = await response.json()
    console.log('📡 Twilio API response:', JSON.stringify(result, null, 2));

    if (!response.ok) {
      console.error('❌ Twilio API error:', result);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.message || 'Failed to send SMS',
          twilioError: result
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Test SMS sent successfully:', result.sid);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageSid: result.sid,
        status: result.status,
        message: 'Test SMS sent successfully!'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 Error in test-sms function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Server error: ${error.message}`
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})