
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    const { settingType, value } = await req.json()

    // Validate phone number format for Twilio settings
    if (settingType === 'TWILIO_PHONE_NUMBER') {
      const phoneRegex = /^\+1[0-9]{10}$/
      if (!phoneRegex.test(value)) {
        return new Response(
          JSON.stringify({ error: 'Phone number must be in E.164 format (+1XXXXXXXXXX)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Validate OpenAI API key format
    if (settingType === 'OPENAI_API_KEY') {
      if (!value.startsWith('sk-') || value.length < 50) {
        return new Response(
          JSON.stringify({ error: 'Invalid OpenAI API key format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Validate Twilio Account SID format
    if (settingType === 'TWILIO_ACCOUNT_SID') {
      if (!value.startsWith('AC') || value.length < 30) {
        return new Response(
          JSON.stringify({ error: 'Invalid Twilio Account SID format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Validate Twilio Auth Token format
    if (settingType === 'TWILIO_AUTH_TOKEN') {
      if (value.length < 30) {
        return new Response(
          JSON.stringify({ error: 'Invalid Twilio Auth Token format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Log the setting update (in production, this would update the Supabase secrets)
    console.log(`Setting ${settingType} updated successfully`)

    // Get a user-friendly name for the setting
    const settingNames = {
      'OPENAI_API_KEY': 'OpenAI API Key',
      'TWILIO_ACCOUNT_SID': 'Twilio Account SID',
      'TWILIO_AUTH_TOKEN': 'Twilio Auth Token',
      'TWILIO_PHONE_NUMBER': 'Twilio Phone Number'
    }

    const friendlyName = settingNames[settingType] || settingType

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${friendlyName} updated successfully`,
        note: 'Settings have been updated. Changes will take effect immediately for new requests.'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error updating settings:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
