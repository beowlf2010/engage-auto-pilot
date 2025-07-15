import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2'

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
    const body = await req.json()
    const { to, message, systemCheck, testMode } = body
    
    // Handle system check mode
    if (systemCheck || testMode) {
      console.log('🔍 Running SMS system check...');
    } else {
      // Regular SMS sending requires to and message
      if (!to || !message) {
        return new Response(
          JSON.stringify({ success: false, error: 'Phone number and message are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      console.log(`📱 Testing SMS to ${to}`);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get Twilio credentials from database
    const { data: settings, error } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'])

    if (error) {
      console.error('❌ Database error:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch Twilio credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const settingsMap: Record<string, string> = {}
    settings?.forEach(setting => {
      settingsMap[setting.key] = setting.value
    })

    const accountSid = settingsMap['TWILIO_ACCOUNT_SID']
    const authToken = settingsMap['TWILIO_AUTH_TOKEN']
    const phoneNumber = settingsMap['TWILIO_PHONE_NUMBER']

    if (!accountSid || !authToken || !phoneNumber) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing Twilio credentials in database',
          hasAccountSid: !!accountSid,
          hasAuthToken: !!authToken,
          hasPhoneNumber: !!phoneNumber
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Twilio credentials found:', {
      accountSidStart: accountSid.substring(0, 6) + '...',
      phoneNumber: phoneNumber
    });

    // Handle system check mode
    if (systemCheck || testMode) {
      console.log('🔍 System check mode - testing Twilio API connectivity...');
      
      // Enhanced Twilio API validation with retry logic
      const validateTwilioCredentials = async (retryCount = 0) => {
        const twilioValidationUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`
        
        try {
          const validationResponse = await fetch(twilioValidationUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
            },
            signal: AbortSignal.timeout(10000) // 10 second timeout
          })

          const validationResult = await validationResponse.json()
          console.log('📡 Twilio validation response:', JSON.stringify(validationResult, null, 2));

          if (!validationResponse.ok) {
            console.error('❌ Twilio credentials validation failed:', {
              status: validationResponse.status,
              statusText: validationResponse.statusText,
              result: validationResult,
              accountSidUsed: accountSid.substring(0, 6) + '...',
              retryCount
            });

            // Provide specific error messages for common issues
            let errorMessage = 'Twilio credentials validation failed';
            let troubleshooting = 'Check your Twilio Account SID and Auth Token';

            if (validationResponse.status === 401) {
              errorMessage = 'Twilio authentication failed';
              troubleshooting = 'Your Account SID or Auth Token is incorrect. Please verify them in your Twilio Console.';
            } else if (validationResponse.status === 404) {
              errorMessage = 'Twilio account not found';
              troubleshooting = 'Your Account SID does not exist. Please check your Twilio Console.';
            } else if (validationResponse.status === 429) {
              errorMessage = 'Twilio rate limit exceeded';
              troubleshooting = 'Too many requests to Twilio API. Please try again in a few minutes.';
            } else if (validationResponse.status >= 500) {
              errorMessage = 'Twilio service unavailable';
              troubleshooting = 'Twilio API is experiencing issues. Please try again later.';
            }

            // For non-critical errors, still return success with warning
            if (validationResponse.status === 429 || validationResponse.status >= 500) {
              console.log('⚠️ SMS system check passed with warning - Twilio API temporarily unavailable');
              return new Response(
                JSON.stringify({ 
                  success: true, 
                  warning: true,
                  message: 'SMS system check passed with warning',
                  error: errorMessage,
                  troubleshooting: troubleshooting,
                  details: 'Credentials exist in database but Twilio API validation failed temporarily',
                  credentialsStatus: 'configured_but_unvalidated',
                  twilioPhoneNumber: phoneNumber
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }

            return new Response(
              JSON.stringify({ 
                success: false, 
                error: errorMessage,
                troubleshooting: troubleshooting,
                twilioError: validationResult,
                credentialsStatus: 'invalid',
                debugInfo: {
                  accountSidUsed: accountSid.substring(0, 6) + '...',
                  phoneNumber: phoneNumber,
                  httpStatus: validationResponse.status
                }
              }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          console.log('✅ SMS system check passed - Twilio credentials are valid');
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'SMS system check passed',
              twilioAccountName: validationResult.friendly_name || 'Unknown',
              twilioPhoneNumber: phoneNumber,
              credentialsStatus: 'valid_and_verified',
              accountStatus: validationResult.status || 'active'
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )

        } catch (networkError) {
          console.error('🌐 Network error during Twilio validation:', {
            error: networkError.message,
            retryCount,
            accountSidUsed: accountSid.substring(0, 6) + '...'
          });

          // Retry on network errors (up to 2 retries)
          if (retryCount < 2 && (networkError.name === 'TypeError' || networkError.name === 'AbortError')) {
            console.log(`🔄 Retrying Twilio validation... (attempt ${retryCount + 1}/2)`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
            return validateTwilioCredentials(retryCount + 1);
          }

          // After retries failed, return success with warning (since credentials exist in DB)
          console.log('⚠️ SMS system check passed with warning - network connectivity issues');
          return new Response(
            JSON.stringify({ 
              success: true, 
              warning: true,
              message: 'SMS system check passed with warning',
              error: 'Network connectivity issues with Twilio API',
              troubleshooting: 'Your credentials are configured but could not be validated due to network issues. SMS may still work.',
              details: 'Credentials exist in database but network validation failed',
              credentialsStatus: 'configured_but_unvalidated',
              twilioPhoneNumber: phoneNumber,
              networkError: networkError.message
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      return validateTwilioCredentials();
    }

    // Send test SMS via Twilio (regular mode)
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
    console.log('📡 Twilio API response:', JSON.stringify(result, null, 2));

    if (!response.ok) {
      console.error('❌ Twilio API error:', result);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.message || 'Failed to send SMS',
          twilioError: result
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Test SMS sent successfully:', result.sid);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageSid: result.sid,
        status: result.status,
        message: 'Test SMS sent successfully!'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 Error in test-sms function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Server error: ${error.message}`
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})