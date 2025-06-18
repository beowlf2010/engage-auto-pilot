
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Utility to get Twilio API credentials
async function getTwilioSecrets() {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
  const phoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

  if (!accountSid || !authToken || !phoneNumber) {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: settings } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'])

    const settingsMap = {}
    settings?.forEach(setting => {
      settingsMap[setting.key] = setting.value
    })

    return {
      accountSid: accountSid || settingsMap['TWILIO_ACCOUNT_SID'],
      authToken: authToken || settingsMap['TWILIO_AUTH_TOKEN'],
      phoneNumber: phoneNumber || settingsMap['TWILIO_PHONE_NUMBER']
    }
  }

  return { accountSid, authToken, phoneNumber }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('send-sms function invoked.');
    const { to, body, conversationId } = await req.json()
    console.log(`Received request to send to ${to} for conversation ${conversationId}`);

    // Get Twilio credentials
    console.log('Fetching Twilio secrets...');
    const { accountSid, authToken, phoneNumber } = await getTwilioSecrets()

    if (!accountSid || !authToken || !phoneNumber) {
      console.error('Missing Twilio API credentials.', { 
        hasAccountSid: !!accountSid, 
        hasAuthToken: !!authToken, 
        hasPhoneNumber: !!phoneNumber 
      });
      throw new Error('Missing Twilio API credentials')
    }
    console.log('Twilio secrets fetched successfully.');

    // Compose the Twilio API request
    const payload = new URLSearchParams({
      To: to,
      From: phoneNumber,
      Body: body
    })

    console.log('Sending SMS with payload:', { to, from: phoneNumber, body })

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: payload
    })
    console.log('Twilio API response status:', response.status);

    const result = await response.json()
    console.log('Twilio API response body:', JSON.stringify(result));
    
    if (!response.ok) {
      console.error('Twilio API error:', result)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.message || 'Failed to send SMS',
          conversationId 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const messageId = result.sid || 'unknown'
    console.log('Twilio SMS sent successfully:', messageId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageSid: messageId,
        status: result.status || 'queued',
        conversationId
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Critical error in send-sms function:', error.message, error.stack);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
