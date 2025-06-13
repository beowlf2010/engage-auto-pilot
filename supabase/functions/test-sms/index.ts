
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the user from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { testPhoneNumber } = await req.json()

    if (!testPhoneNumber) {
      return new Response(
        JSON.stringify({ error: 'Test phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Twilio credentials from environment first
    let accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    let authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    let fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

    // If not in environment, get from database
    if (!accountSid || !authToken || !fromNumber) {
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
      return new Response(
        JSON.stringify({ 
          error: 'Missing Twilio credentials. Please configure your Twilio settings first.',
          details: {
            hasSid: !!accountSid,
            hasToken: !!authToken,
            hasPhone: !!fromNumber
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send test SMS using Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    const auth = btoa(`${accountSid}:${authToken}`)

    const formData = new URLSearchParams()
    formData.append('To', testPhoneNumber)
    formData.append('From', fromNumber)
    formData.append('Body', `Test message from your CRM system at ${new Date().toLocaleString()}. Your Twilio integration is working correctly!`)

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
          error: result.message || 'Failed to send test SMS',
          details: result
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Test SMS sent successfully:', result.sid)
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Test SMS sent successfully!',
        twilioMessageId: result.sid,
        status: result.status,
        to: testPhoneNumber,
        from: fromNumber
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in test-sms function:', error)
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
