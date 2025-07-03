
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2'
import { getTwilioSecrets } from './utils/twilioCredentials.ts'
import { authenticateAndAuthorize } from './utils/authUtils.ts'
import { sendTestSMS } from './utils/smsService.ts'

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Authenticate and authorize the user
    const authResult = await authenticateAndAuthorize(req, supabase)
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { 
          status: authResult.statusCode || 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const { testPhoneNumber } = await req.json()
    console.log('📱 Test phone number received:', testPhoneNumber);
    
    if (!testPhoneNumber) {
      return new Response(
        JSON.stringify({ error: 'Test phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Twilio credentials
    console.log('🔑 Fetching Twilio credentials...');
    const { accountSid, authToken, phoneNumber, source } = await getTwilioSecrets(supabase)
    
    if (!accountSid || !authToken || !phoneNumber) {
      console.error('❌ Missing Twilio credentials:', { 
        hasAccountSid: !!accountSid, 
        hasAuthToken: !!authToken,
        hasPhoneNumber: !!phoneNumber,
        source: source,
        accountSidStart: accountSid ? accountSid.substring(0, 6) + '...' : 'none',
        phoneNumber: phoneNumber || 'none'
      });
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Missing Twilio credentials. Please configure your Account SID, Auth Token, and Phone Number in the Settings first.',
          details: {
            hasAccountSid: !!accountSid,
            hasAuthToken: !!authToken,
            hasPhoneNumber: !!phoneNumber,
            credentialsSource: source,
            debugInfo: `Account SID: ${accountSid ? 'present' : 'missing'}, Auth Token: ${authToken ? 'present' : 'missing'}, Phone: ${phoneNumber ? 'present' : 'missing'}, Source: ${source}`
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('✅ Twilio credentials found from', source.toUpperCase(), '- Account SID:', accountSid.substring(0, 6) + '...', 'Phone:', phoneNumber);

    // Send the SMS
    const smsResult = await sendTestSMS(testPhoneNumber, accountSid, authToken, phoneNumber, source)
    
    const statusCode = smsResult.success ? 200 : 400
    return new Response(
      JSON.stringify(smsResult),
      { 
        status: statusCode, 
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
