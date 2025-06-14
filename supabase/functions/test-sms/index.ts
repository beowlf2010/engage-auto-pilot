
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Utility to get Telnyx API credentials
async function getTelnyxSecrets() {
  const apiKey = Deno.env.get('TELNYX_API_KEY')
  const messagingProfileId = Deno.env.get('TELNYX_MESSAGING_PROFILE_ID')

  if (!apiKey || !messagingProfileId) {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: settings } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['TELNYX_API_KEY', 'TELNYX_MESSAGING_PROFILE_ID'])

    const settingsMap = {}
    settings?.forEach(setting => {
      settingsMap[setting.key] = setting.value
    })

    return {
      apiKey: apiKey || settingsMap['TELNYX_API_KEY'],
      messagingProfileId: messagingProfileId || settingsMap['TELNYX_MESSAGING_PROFILE_ID']
    }
  }

  return { apiKey, messagingProfileId }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Auth check (same as before)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check admin
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

    // Get Telnyx credentials
    const { apiKey, messagingProfileId } = await getTelnyxSecrets()
    if (!apiKey || !messagingProfileId) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing Telnyx credentials. Please configure your Telnyx settings first.',
          details: {
            hasApiKey: !!apiKey,
            hasProfile: !!messagingProfileId
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send test SMS
    const telnyxUrl = "https://api.telnyx.com/v2/messages"
    const payload = {
      to: testPhoneNumber,
      from: null, // Allow profile default
      text: `Test message from your CRM (Telnyx integration) at ${new Date().toLocaleString()}.`,
      messaging_profile_id: messagingProfileId
    }

    const response = await fetch(telnyxUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('Telnyx API error:', result)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.errors ? result.errors[0]?.detail : result.message || 'Failed to send test SMS',
          details: result
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Telnyx test SMS sent successfully:', result.data?.id)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Test SMS sent successfully!',
        telnyxMessageId: result.data?.id,
        status: result.data?.record_type || 'submitted',
        to: testPhoneNumber
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
