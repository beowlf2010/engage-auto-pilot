
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
    // Get from settings table as a fallback
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, body, conversationId } = await req.json()

    // Get Telnyx credentials
    const { apiKey, messagingProfileId } = await getTelnyxSecrets()

    if (!apiKey || !messagingProfileId) {
      throw new Error('Missing Telnyx API credentials')
    }

    // Compose the Telnyx API request
    const telnyxUrl = "https://api.telnyx.com/v2/messages"
    const payload = {
      to,
      from: null, // Allow profile default
      text: body,
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
          error: result.errors ? result.errors[0]?.detail : result.message || 'Failed to send SMS',
          conversationId 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const messageId = result.data?.id || 'unknown'
    console.log('Telnyx SMS sent successfully:', messageId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        telnyxMessageId: messageId,
        status: result.data?.record_type || 'submitted',
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
