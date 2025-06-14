
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
    console.log('=== TEST SMS FUNCTION START ===');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Performing auth check...');
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('ERROR: No authorization header');
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
    console.log('✓ Auth check passed for user:', user.id);

    console.log('Performing admin check...');
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      console.error('Admin check failed for user:', user.id, 'Role:', profile?.role);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('✓ Admin check passed.');

    const { testPhoneNumber } = await req.json()
    console.log('📱 Test phone number received:', testPhoneNumber);
    
    if (!testPhoneNumber) {
      return new Response(
        JSON.stringify({ error: 'Test phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔑 Fetching Telnyx credentials...');
    const { apiKey, messagingProfileId } = await getTelnyxSecrets()
    
    if (!apiKey || !messagingProfileId) {
      console.error('❌ Missing Telnyx credentials:', { 
        hasApiKey: !!apiKey, 
        hasProfile: !!messagingProfileId,
        apiKeyStart: apiKey ? apiKey.substring(0, 6) + '...' : 'none',
        profileId: messagingProfileId || 'none'
      });
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Missing Telnyx credentials. Please configure your API key and messaging profile ID first.',
          details: {
            hasApiKey: !!apiKey,
            hasProfile: !!messagingProfileId
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('✓ Telnyx credentials found - API Key:', apiKey.substring(0, 6) + '...', 'Profile:', messagingProfileId);

    // Send test SMS
    const telnyxUrl = "https://api.telnyx.com/v2/messages"
    const payload = {
      to: testPhoneNumber,
      text: `🔥 Test SMS from your CRM system sent at ${new Date().toLocaleString()}! This confirms your Telnyx integration is working.`,
      messaging_profile_id: messagingProfileId
    }
    
    console.log('📤 Sending to Telnyx API:', {
      url: telnyxUrl,
      to: testPhoneNumber,
      profileId: messagingProfileId,
      messageLength: payload.text.length
    });

    const response = await fetch(telnyxUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    console.log('📡 Telnyx API response status:', response.status);
    console.log('📡 Telnyx API response headers:', Object.fromEntries(response.headers.entries()));

    const result = await response.json()
    console.log('📡 Telnyx API full response:', JSON.stringify(result, null, 2));

    if (!response.ok) {
      console.error('❌ Telnyx API error details:', {
        status: response.status,
        statusText: response.statusText,
        result: result
      });
      
      let errorMessage = 'Failed to send test SMS';
      if (result.errors && result.errors.length > 0) {
        errorMessage = result.errors[0].detail || result.errors[0].title || errorMessage;
      } else if (result.message) {
        errorMessage = result.message;
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage,
          telnyxError: result,
          statusCode: response.status
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ SUCCESS! Telnyx SMS sent:', result.data?.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Test SMS sent successfully!',
        telnyxMessageId: result.data?.id,
        status: result.data?.record_type || 'submitted',
        to: testPhoneNumber,
        sentAt: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('💥 CRITICAL ERROR in test-sms function:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Server error: ${error.message}`,
        type: 'server_error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
