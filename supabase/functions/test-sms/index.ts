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
    console.log('test-sms function invoked.');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Performing auth check...');
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
      console.error('Auth check failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('Auth check passed for user:', user.id);

    console.log('Performing admin check...');
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      console.error('Admin check failed for user:', user.id);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('Admin check passed.');

    const { testPhoneNumber } = await req.json()
    console.log('Received test phone number:', testPhoneNumber);
    if (!testPhoneNumber) {
      return new Response(
        JSON.stringify({ error: 'Test phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Fetching Telnyx secrets...');
    const { apiKey, messagingProfileId } = await getTelnyxSecrets()
    if (!apiKey || !messagingProfileId) {
      console.error('Missing Telnyx credentials.', { hasApiKey: !!apiKey, hasProfile: !!messagingProfileId });
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
    console.log('Telnyx secrets fetched successfully.');

    // Send test SMS
    const telnyxUrl = "https://api.telnyx.com/v2/messages"
    const payload = {
      to: testPhoneNumber,
      from: null, // Allow profile default
      text: `Test message from your CRM (Telnyx integration) at ${new Date().toLocaleString()}.`,
      messaging_profile_id: messagingProfileId
    }
    console.log('Sending test SMS with payload:', JSON.stringify(payload));

    const response = await fetch(telnyxUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    console.log('Telnyx API response status:', response.status);

    const result = await response.json()
    console.log('Telnyx API response body:', JSON.stringify(result));

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
    console.error('Critical error in test-sms function:', error.message, error.stack);
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
