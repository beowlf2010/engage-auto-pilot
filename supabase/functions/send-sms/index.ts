-- EMERGENCY SHUTDOWN: Disable all AI automation and outgoing messages
-- This will completely stop all automated messaging while fixing Smart Inbox

-- 1. Emergency disable AI system
UPDATE public.ai_emergency_settings 
SET ai_disabled = true, 
    disable_reason = 'Emergency shutdown for Smart Inbox fixes',
    disabled_at = now(),
    updated_at = now()
WHERE id = '237cbf27-f24a-46a8-945c-164af4ae9035';

-- 2. Disable all cron jobs for AI automation
SELECT cron.unschedule('ai-automation-robust');
SELECT cron.unschedule('cleanup-stuck-automation'); 

-- 3. Pause all leads with pending AI messages
UPDATE public.leads 
SET ai_opt_in = false,
    ai_stage = 'emergency_paused',
    next_ai_send_at = NULL,
    ai_sequence_paused = true,
    updated_at = now()
WHERE ai_opt_in = true OR next_ai_send_at IS NOT NULL;

-- 4. Clear any scheduled AI message queue
UPDATE public.ai_message_schedule 
SET status = 'cancelled',
    updated_at = now()
WHERE status = 'scheduled';

-- 5. Add emergency shutdown check to automation control
UPDATE public.ai_automation_control 
SET automation_enabled = false, 
    emergency_stop = true,
    updated_at = now()
WHERE id = (SELECT id FROM public.ai_automation_control LIMIT 1);

-- 6. Log the emergency shutdown
INSERT INTO public.ai_automation_runs (
  source,
  status,
  started_at,
  completed_at,
  error_message,
  processed_leads,
  successful_sends,
  failed_sends
) VALUES (
  'emergency_shutdown',
  'completed',
  now(),
  now(),
  'Emergency shutdown initiated for Smart Inbox fixes',
  0,
  0,
  0
);

-- Verify shutdown status
SELECT 
  'AI Emergency Settings' as system,
  ai_disabled as disabled_status,
  disable_reason
FROM public.ai_emergency_settings
UNION ALL
SELECT 
  'Automation Control' as system,
  NOT automation_enabled as disabled_status,
  CASE WHEN emergency_stop THEN 'Emergency stop active' ELSE 'Normal' END as disable_reason
FROM public.ai_automation_control
UNION ALL
SELECT 
  'Active Cron Jobs' as system,
  (COUNT(*) = 0) as disabled_status,
  CASE WHEN COUNT(*) = 0 THEN 'All AI cron jobs disabled' ELSE CONCAT(COUNT(*), ' active jobs found') END as disable_reason
FROM cron.job 
WHERE jobname LIKE '%ai%automation%';
```

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2'

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

    console.log(`📱 Received request: {
  to: "${to}",
  messageLength: ${message?.length || 0},
  conversationId: "${conversationId}",
  leadId: ${leadId || 'undefined'},
  profileId: ${leadId || 'undefined'},
  isAIGenerated: ${leadId || 'undefined'}
}`);

    // Check suppression list
    console.log(`🚫 [COMPLIANCE] Checking suppression list for: ${to}`);
    
    const { data: suppressionData, error: suppressionError } = await supabase
      .from('sms_suppression_list')
      .select('*')
      .eq('phone_number', to)
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
