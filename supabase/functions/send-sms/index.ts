
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, body, conversationId } = await req.json()

    // Get Twilio credentials from environment
    let accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    let authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    let fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

    // If not in environment, try database fallback
    if (!accountSid || !authToken || !fromNumber) {
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

      accountSid = accountSid || settingsMap['TWILIO_ACCOUNT_SID']
      authToken = authToken || settingsMap['TWILIO_AUTH_TOKEN']
      fromNumber = fromNumber || settingsMap['TWILIO_PHONE_NUMBER']
    }

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Missing Twilio credentials')
    }

    // Create Twilio API request
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    const auth = btoa(`${accountSid}:${authToken}`)

    const formData = new URLSearchParams()
    formData.append('To', to)
    formData.append('From', fromNumber)
    formData.append('Body', body)

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    })

    const result = await response.json()

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

    console.log('SMS sent successfully:', result.sid)
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        twilioMessageId: result.sid,
        status: result.status,
        conversationId
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in send-sms function:', error)
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
