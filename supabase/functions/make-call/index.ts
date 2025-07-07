import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CallRequest {
  queueId: string;
  leadId: string;
  phoneNumber: string;
  campaignId?: string;
  enableVoicemailDetection?: boolean;
  voicemailTemplate?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== MAKE CALL FUNCTION START ===');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get request data
    const { queueId, leadId, phoneNumber, campaignId, enableVoicemailDetection, voicemailTemplate }: CallRequest = await req.json()
    console.log('📞 Making call to:', phoneNumber, 'for lead:', leadId, 'with voicemail detection:', enableVoicemailDetection);

    // Get Twilio credentials from Supabase secrets or settings
    const { data: settings } = await supabase
      .from('settings')
      .select('twilio_account_sid, twilio_auth_token, twilio_phone_number')
      .limit(1)
      .maybeSingle()

    const twilioAccountSid = settings?.twilio_account_sid || Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioAuthToken = settings?.twilio_auth_token || Deno.env.get('TWILIO_AUTH_TOKEN') 
    const twilioPhoneNumber = settings?.twilio_phone_number || Deno.env.get('TWILIO_PHONE_NUMBER')

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.error('❌ Missing Twilio credentials');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing Twilio credentials' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create call log entry
    const { data: callLog, error: logError } = await supabase
      .from('call_logs')
      .insert({
        lead_id: leadId,
        phone_number: phoneNumber,
        call_direction: 'outbound',
        call_status: 'initiated',
        campaign_id: campaignId,
        scheduled_at: new Date().toISOString(),
        created_by: null // System-initiated call
      })
      .select('id')
      .single()

    if (logError) {
      console.error('Failed to create call log:', logError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create call log' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Make the Twilio call
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/call-status-webhook`
    
    const callPayload = new URLSearchParams({
      From: twilioPhoneNumber,
      To: phoneNumber,
      Url: `${webhookUrl}?callLogId=${callLog.id}&leadId=${leadId}`,
      StatusCallback: `${webhookUrl}?callLogId=${callLog.id}&leadId=${leadId}`,
      StatusCallbackEvent: 'initiated,ringing,answered,completed',
      StatusCallbackMethod: 'POST',
      Record: 'true',
      RecordingStatusCallback: `${webhookUrl}?callLogId=${callLog.id}&leadId=${leadId}&event=recording`
    })

    // Add voicemail detection if enabled
    if (enableVoicemailDetection) {
      callPayload.append('MachineDetection', 'Enable')
      callPayload.append('MachineDetectionTimeout', '30')
      callPayload.append('MachineDetectionSpeechThreshold', '2400')
      callPayload.append('MachineDetectionSpeechEndThreshold', '1200')
      callPayload.append('MachineDetectionSilenceTimeout', '5000')
      
      if (voicemailTemplate) {
        // Create TwiML for voicemail drop
        const twimlUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/voicemail-twiml?message=${encodeURIComponent(voicemailTemplate)}`
        callPayload.set('Url', twimlUrl)
      }
    }

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: callPayload.toString()
    })

    const twilioData = await twilioResponse.json()
    console.log('📞 Twilio response:', twilioData);

    if (!twilioResponse.ok) {
      console.error('❌ Twilio call failed:', twilioData);
      
      // Update call log with failure
      await supabase
        .from('call_logs')
        .update({
          call_status: 'failed',
          notes: `Twilio error: ${twilioData.message || 'Unknown error'}`,
          ended_at: new Date().toISOString()
        })
        .eq('id', callLog.id)

      // Update queue with failure
      await supabase
        .from('auto_dial_queue')
        .update({
          status: 'failed',
          last_attempt_at: new Date().toISOString(),
          last_attempt_outcome: 'twilio_error',
          attempt_count: supabase.raw('attempt_count + 1')
        })
        .eq('id', queueId)

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Twilio call failed: ${twilioData.message}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update call log with Twilio call ID
    await supabase
      .from('call_logs')
      .update({
        twilio_call_id: twilioData.sid,
        call_status: 'ringing',
        started_at: new Date().toISOString()
      })
      .eq('id', callLog.id)

    // Update queue status
    await supabase
      .from('auto_dial_queue')
      .update({
        status: 'calling',
        last_attempt_at: new Date().toISOString(),
        attempt_count: supabase.raw('attempt_count + 1')
      })
      .eq('id', queueId)

    console.log('✅ Call initiated successfully, Twilio SID:', twilioData.sid);

    return new Response(
      JSON.stringify({
        success: true,
        callId: twilioData.sid,
        callLogId: callLog.id,
        status: 'initiated'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 CRITICAL ERROR in make-call function:', error);
    
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