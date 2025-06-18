
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Utility to get Twilio API credentials - prioritize database over environment
async function getTwilioSecrets() {
  console.log('🔍 Fetching Twilio credentials - checking database first...');
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // First check database settings
  const { data: settings, error } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'])

  if (error) {
    console.error('❌ Database error:', error);
  } else {
    console.log('📊 Retrieved settings from database:', settings?.map(s => ({ key: s.key, hasValue: !!s.value })));
  }

  const settingsMap = {}
  settings?.forEach(setting => {
    settingsMap[setting.key] = setting.value
  })

  const dbAccountSid = settingsMap['TWILIO_ACCOUNT_SID']
  const dbAuthToken = settingsMap['TWILIO_AUTH_TOKEN']
  const dbPhoneNumber = settingsMap['TWILIO_PHONE_NUMBER']

  console.log('📊 Database settings parsed:', {
    hasDbAccountSid: !!dbAccountSid,
    hasDbAuthToken: !!dbAuthToken,
    hasDbPhoneNumber: !!dbPhoneNumber,
    dbAccountSidStart: dbAccountSid ? dbAccountSid.substring(0, 6) + '...' : 'none',
    dbPhoneNumber: dbPhoneNumber || 'none'
  });

  // If we have complete database settings, use them
  if (dbAccountSid && dbAuthToken && dbPhoneNumber) {
    console.log('✅ Using DATABASE credentials (from Settings UI)');
    return { 
      accountSid: dbAccountSid, 
      authToken: dbAuthToken, 
      phoneNumber: dbPhoneNumber,
      source: 'database'
    }
  }

  // Fall back to environment variables only if database is incomplete
  console.log('⚠️ Database credentials incomplete, checking environment variables...');
  const envAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const envAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
  const envPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')
  
  console.log('🔍 Environment check:', {
    hasEnvAccountSid: !!envAccountSid,
    hasEnvAuthToken: !!envAuthToken,
    hasEnvPhoneNumber: !!envPhoneNumber,
    envAccountSidStart: envAccountSid ? envAccountSid.substring(0, 6) + '...' : 'none',
    envPhoneNumber: envPhoneNumber || 'none'
  });

  if (envAccountSid && envAuthToken && envPhoneNumber) {
    console.log('⚠️ Using ENVIRONMENT VARIABLES as fallback');
    return { 
      accountSid: envAccountSid, 
      authToken: envAuthToken, 
      phoneNumber: envPhoneNumber,
      source: 'environment'
    }
  }

  console.log('❌ No complete Twilio credentials found in database or environment');
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
    console.log('=== TEST SMS FUNCTION START ===');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔐 Performing auth check...');
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('❌ No authorization header');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      console.error('❌ Auth check failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('✅ Auth check passed for user:', user.id);

    console.log('👑 Performing admin check...');
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      console.error('❌ Admin check failed for user:', user.id, 'Role:', profile?.role);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('✅ Admin check passed');

    const { testPhoneNumber } = await req.json()
    console.log('📱 Test phone number received:', testPhoneNumber);
    
    if (!testPhoneNumber) {
      return new Response(
        JSON.stringify({ error: 'Test phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔑 Fetching Twilio credentials...');
    const { accountSid, authToken, phoneNumber, source } = await getTwilioSecrets()
    
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

    // Send test SMS using Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    const payload = new URLSearchParams({
      To: testPhoneNumber,
      From: phoneNumber,
      Body: `🔥 Test SMS from your CRM system sent at ${new Date().toLocaleString()}! This confirms your Twilio integration is working properly.`
    })
    
    console.log('📤 Sending to Twilio API:', {
      url: twilioUrl,
      to: testPhoneNumber,
      from: phoneNumber,
      messageLength: payload.get('Body')?.length || 0,
      accountSidStart: accountSid.substring(0, 6) + '...',
      credentialsSource: source
    });

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: payload
    })

    console.log('📡 Twilio API response status:', response.status);
    const result = await response.json()
    console.log('📡 Twilio API full response:', JSON.stringify(result, null, 2));

    if (!response.ok) {
      console.error('❌ Twilio API error details:', {
        status: response.status,
        statusText: response.statusText,
        result: result,
        usedAccountSid: accountSid.substring(0, 6) + '...',
        usedPhoneNumber: phoneNumber,
        credentialsSource: source
      });
      
      let errorMessage = 'Failed to send test SMS';
      if (result.message) {
        errorMessage = result.message;
        
        // Add specific help for common errors
        if (result.code === 21211) {
          errorMessage += '. Please verify that your phone number is in E.164 format (e.g., +15551234567).';
        } else if (result.code === 21608) {
          errorMessage += '. Please verify your Twilio phone number in your Twilio Console.';
        }
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage,
          twilioError: result,
          statusCode: response.status,
          credentialsSource: source,
          debugInfo: `Using Phone Number: ${phoneNumber} from ${source}`
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ SUCCESS! Twilio SMS sent using', source.toUpperCase(), 'credentials:', result.sid);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Test SMS sent successfully using your configured settings!',
        twilioMessageId: result.sid,
        status: result.status || 'queued',
        to: testPhoneNumber,
        from: phoneNumber,
        credentialsSource: source,
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
