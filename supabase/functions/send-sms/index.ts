
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Updated utility to get Twilio API credentials - prioritizes database over environment
async function getTwilioSecrets(supabase: any) {
  console.log('🔍 Fetching Twilio credentials - checking database first...');
  
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

  const settingsMap: Record<string, string> = {}
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== SEND SMS FUNCTION START ===');
    const requestData = await req.json();
    
    // Support both legacy format and new consolidated format
    const { 
      to, 
      body, 
      conversationId, 
      leadId, 
      messageBody, 
      profileId, 
      isAIGenerated 
    } = requestData;

    // Determine which format we're using
    const recipientPhone = to;
    const messageText = body || messageBody;
    const isConsolidatedCall = leadId && messageBody && profileId !== undefined;
    
    console.log(`📱 Received ${isConsolidatedCall ? 'CONSOLIDATED' : 'LEGACY'} request:`, {
      to: recipientPhone,
      messageLength: messageText?.length,
      conversationId,
      leadId,
      profileId,
      isAIGenerated
    });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // CRITICAL: Check suppression list before sending (COMPLIANCE)
    console.log('🚫 [COMPLIANCE] Checking suppression list for:', recipientPhone);
    const { data: suppressionCheck, error: suppressionError } = await supabase
      .from('compliance_suppression_list')
      .select('id, reason, created_at, details')
      .eq('contact', recipientPhone)
      .eq('type', 'sms')
      .limit(1);

    if (suppressionError) {
      console.error('❌ [COMPLIANCE] Error checking suppression list:', suppressionError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Suppression check failed',
        conversationId: conversationId
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (suppressionCheck && suppressionCheck.length > 0) {
      const suppression = suppressionCheck[0];
      console.log(`🚫 [COMPLIANCE] BLOCKING SMS - Phone ${recipientPhone} is on suppression list`);
      console.log(`🚫 [COMPLIANCE] Reason: ${suppression.reason} (${suppression.details || 'No details'})`);
      console.log(`🚫 [COMPLIANCE] Added: ${suppression.created_at}`);
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Phone number on suppression list',
        reason: suppression.reason,
        blocked: true,
        compliance: true,
        conversationId: conversationId
      }), {
        status: 200, // Return 200 to prevent retries
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ [COMPLIANCE] Phone number not on suppression list - proceeding with send');

    // Get Twilio credentials using updated logic
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
          conversationId,
          details: {
            hasAccountSid: !!accountSid,
            hasAuthToken: !!authToken,
            hasPhoneNumber: !!phoneNumber,
            credentialsSource: source
          }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    console.log('✅ Twilio credentials found from', source.toUpperCase(), '- Account SID:', accountSid.substring(0, 6) + '...', 'Phone:', phoneNumber);

    let currentConversationId = conversationId;
    
    // If this is a consolidated call and no conversation exists, create one
    if (isConsolidatedCall && !conversationId) {
      console.log('📝 Creating conversation record for consolidated call...');
      
      const conversationData = {
        lead_id: leadId,
        profile_id: profileId,
        body: messageText,
        direction: 'out',
        sent_at: new Date().toISOString(),
        ai_generated: isAIGenerated || false,
        sms_status: 'pending'
      };

      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .insert(conversationData)
        .select()
        .single();

      if (conversationError) {
        console.error('❌ Failed to create conversation:', conversationError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to create conversation: ${conversationError.message}`,
            leadId
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      currentConversationId = conversation.id;
      console.log(`✅ Created conversation: ${currentConversationId}`);
    }

    // Compose the Twilio API request
    const payload = new URLSearchParams({
      To: recipientPhone,
      From: phoneNumber,
      Body: messageText
    })

    console.log('📤 Sending SMS with payload:', { 
      to: recipientPhone, 
      from: phoneNumber, 
      bodyLength: messageText.length,
      conversationId: currentConversationId,
      credentialsSource: source,
      isConsolidated: isConsolidatedCall
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
        credentialsSource: source,
        conversationId
      });
      
      let errorMessage = result.message || 'Failed to send SMS';
      
      // Add specific help for common errors
      if (result.code === 21211) {
        errorMessage += '. Please verify that your phone number is in E.164 format (e.g., +15551234567).';
      } else if (result.code === 21608) {
        errorMessage += '. Please verify your Twilio phone number in your Twilio Console.';
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage,
          conversationId,
          twilioError: result,
          credentialsSource: source,
          debugInfo: `Using Phone Number: ${phoneNumber} from ${source}`
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const messageId = result.sid || 'unknown'
    console.log('✅ SUCCESS! Twilio SMS sent using', source.toUpperCase(), 'credentials:', messageId)

    // Update conversation status if we have one
    if (currentConversationId) {
      console.log('📝 Updating conversation status to sent...');
      await supabase
        .from('conversations')
        .update({
          sms_status: 'sent',
          twilio_message_id: messageId
        })
        .eq('id', currentConversationId);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageSid: messageId,
        status: result.status || 'queued',
        conversationId: currentConversationId,
        credentialsSource: source,
        message: `SMS sent successfully using ${source} credentials!`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('💥 CRITICAL ERROR in send-sms function:', {
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
