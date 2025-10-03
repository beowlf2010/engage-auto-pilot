// EMERGENCY SHUTDOWN ENABLED - Enhanced safety checks for all outgoing messages
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2'
import { normalizePhoneNumber } from './phoneUtils.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Enhanced emergency shutdown check
async function checkEmergencyShutdown(supabase: any): Promise<boolean> {
  try {
    // Check AI emergency settings
    const { data: emergencySettings } = await supabase
      .from('ai_emergency_settings')
      .select('ai_disabled')
      .single();
    
    if (emergencySettings?.ai_disabled) {
      console.log('🚨 [EMERGENCY] AI system is disabled - blocking all SMS');
      return true;
    }

    // Check automation control
    const { data: automationControl } = await supabase
      .from('ai_automation_control')
      .select('automation_enabled, emergency_stop')
      .single();
    
    if (automationControl?.emergency_stop || !automationControl?.automation_enabled) {
      console.log('🚨 [EMERGENCY] Automation control disabled - blocking all SMS');
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ [EMERGENCY] Error checking shutdown status:', error);
    // Fail safe - if we can't check status, assume shutdown
    return true;
  }
}

async function getTwilioSecrets(supabase: any) {
  const { data: settings, error } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'])

  if (error) {
    console.error('Database error:', error);
  }

  const settingsMap: Record<string, string> = {}
  settings?.forEach(setting => {
    settingsMap[setting.key] = setting.value
  })

  const dbAccountSid = settingsMap['TWILIO_ACCOUNT_SID']
  const dbAuthToken = settingsMap['TWILIO_AUTH_TOKEN']
  const dbPhoneNumber = settingsMap['TWILIO_PHONE_NUMBER']

  if (dbAccountSid && dbAuthToken && dbPhoneNumber) {
    return { 
      accountSid: dbAccountSid, 
      authToken: dbAuthToken, 
      phoneNumber: dbPhoneNumber,
      source: 'database'
    }
  }

  const envAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const envAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
  const envPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

  if (envAccountSid && envAuthToken && envPhoneNumber) {
    return { 
      accountSid: envAccountSid, 
      authToken: envAuthToken, 
      phoneNumber: envPhoneNumber,
      source: 'environment'
    }
  }

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

  console.log('=== SEND SMS FUNCTION START ===');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    // EMERGENCY SHUTDOWN CHECK - HIGHEST PRIORITY
    const isShutdown = await checkEmergencyShutdown(supabase);
    if (isShutdown) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Emergency shutdown active - all messaging disabled',
          blocked: true,
          emergency: true
        }),
        { 
          status: 503, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { to, message, leadId, conversationId } = await req.json()
    
    // Normalize phone number for consistent matching
    const normalizedTo = normalizePhoneNumber(to);
    
    console.log(`📱 Received request: {
  to: "${to}",
  normalized: "${normalizedTo}",
  messageLength: ${message?.length || 0},
  conversationId: "${conversationId}",
  leadId: ${leadId || 'undefined'},
  profileId: ${leadId || 'undefined'},
  isAIGenerated: ${leadId || 'undefined'}
}`);
    
    if (!normalizedTo) {
      console.error(`❌ [VALIDATION] Failed to normalize phone number: ${to}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid phone number format',
          conversationId
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check suppression list with normalized phone
    console.log(`🚫 [COMPLIANCE] Checking suppression list for: ${normalizedTo}`);
    
    const { data: suppressionData, error: suppressionError } = await supabase
      .from('sms_suppression_list')
      .select('*')
      .eq('phone_number', normalizedTo)
      .single();

    if (suppressionData) {
      console.log(`🚫 [COMPLIANCE] BLOCKING SMS - Phone ${to} is on suppression list`);
      console.log(`🚫 [COMPLIANCE] Reason: ${suppressionData.reason}`);
      console.log(`🚫 [COMPLIANCE] Added: ${suppressionData.added_at}`);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Phone number on suppression list',
          reason: suppressionData.reason,
          blocked: true,
          compliance: true,
          conversationId
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get Twilio credentials and send message
    const { accountSid, authToken, phoneNumber, source } = await getTwilioSecrets(supabase)

    if (!accountSid || !authToken || !phoneNumber) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing Twilio credentials'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

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
    
    if (!response.ok) {
      console.error('Twilio API error:', result);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.message || 'Failed to send SMS'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageSid: result.sid,
        leadId,
        conversationId
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in send-sms:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Server error: ${error.message}`
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
