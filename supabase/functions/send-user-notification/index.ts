
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getTwilioSecrets(supabase: any) {
  const { data: settings, error } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'])

  if (error) {
    console.error('Database error:', error);
  }

  const settingsMap: Record<string, string> = {}
  settings?.forEach(setting => {
    settingsMap[setting.key] = setting.value
  })

  const dbAccountSid = settingsMap['TWILIO_ACCOUNT_SID']
  const dbAuthToken = settingsMap['TWILIO_AUTH_TOKEN']
  const dbPhoneNumber = settingsMap['TWILIO_PHONE_NUMBER']

  if (dbAccountSid && dbAuthToken && dbPhoneNumber) {
    return { 
      accountSid: dbAccountSid, 
      authToken: dbAuthToken, 
      phoneNumber: dbPhoneNumber,
      source: 'database'
    }
  }

  const envAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const envAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
  const envPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

  if (envAccountSid && envAuthToken && envPhoneNumber) {
    return { 
      accountSid: envAccountSid, 
      authToken: envAuthToken, 
      phoneNumber: envPhoneNumber,
      source: 'environment'
    }
  }

  return { 
    accountSid: null, 
    authToken: null, 
    phoneNumber: null,
    source: 'none'
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, message, leadId, conversationId } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { accountSid, authToken, phoneNumber, source } = await getTwilioSecrets(supabase)

    if (!accountSid || !authToken || !phoneNumber) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing Twilio credentials'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

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
    
    if (!response.ok) {
      console.error('Twilio API error:', result);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.message || 'Failed to send SMS notification'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageSid: result.sid,
        leadId,
        conversationId
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in send-user-notification:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Server error: ${error.message}`
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
