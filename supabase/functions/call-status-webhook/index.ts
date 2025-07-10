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
    console.log('=== CALL STATUS WEBHOOK START ===');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse URL parameters
    const url = new URL(req.url)
    const callLogId = url.searchParams.get('callLogId')
    const leadId = url.searchParams.get('leadId')
    const eventType = url.searchParams.get('event')

    // Parse form data from Twilio webhook
    const formData = await req.formData()
    const webhookData: Record<string, string> = {}
    
    for (const [key, value] of formData.entries()) {
      webhookData[key] = value.toString()
    }

    console.log('📞 Webhook data:', webhookData);
    console.log('📍 Call Log ID:', callLogId, 'Lead ID:', leadId, 'Event:', eventType);

    if (!callLogId) {
      console.error('❌ Missing callLogId in webhook');
      return new Response('Missing callLogId', { status: 400 })
    }

    // Handle recording events
    if (eventType === 'recording') {
      const recordingUrl = webhookData.RecordingUrl
      if (recordingUrl) {
        await supabase
          .from('call_logs')
          .update({ recording_url: recordingUrl })
          .eq('id', callLogId)
        
        console.log('🎙️ Recording URL saved:', recordingUrl);
        
        // Trigger voice AI transcription process
        if (leadId) {
          try {
            const { data, error } = await supabase.functions.invoke('voice-ai-transcription', {
              body: {
                callLogId,
                recordingUrl,
                leadId
              }
            });
            
            if (error) {
              console.error('❌ Failed to start voice AI transcription:', error);
            } else {
              console.log('✅ Voice AI transcription started:', data?.transcriptionId);
            }
          } catch (transcriptionError) {
            console.error('❌ Error starting transcription:', transcriptionError);
          }
        }
      }
      
      return new Response('OK', { headers: corsHeaders })
    }

    // Handle call status updates
    const callStatus = webhookData.CallStatus
    const callDuration = parseInt(webhookData.CallDuration || '0')
    const callSid = webhookData.CallSid
    const answeredBy = webhookData.AnsweredBy // 'human' or 'machine'
    const machineDetectionDuration = webhookData.MachineDetectionDuration

    console.log('📞 Call status update:', callStatus, 'Duration:', callDuration, 'AnsweredBy:', answeredBy);

    // Determine call outcome based on status and voicemail detection
    let outcome = null
    let queueStatus = 'calling'
    let shouldScheduleRetry = false
    let voicemailDetected = false
    let voicemailDropped = false

    switch (callStatus) {
      case 'completed':
        if (answeredBy === 'machine') {
          outcome = 'voicemail_left'
          voicemailDetected = true
          voicemailDropped = true
          queueStatus = 'completed'
        } else if (callDuration > 30) {
          outcome = 'answered'
          queueStatus = 'completed'
        } else {
          outcome = 'brief_call'
          queueStatus = 'completed'
        }
        break
      case 'busy':
        outcome = 'busy' 
        queueStatus = 'queued'
        shouldScheduleRetry = true
        break
      case 'no-answer':
        outcome = 'no_answer'
        queueStatus = 'queued' 
        shouldScheduleRetry = true
        break
      case 'failed':
        outcome = 'failed'
        queueStatus = 'failed'
        break
      case 'canceled':
        outcome = 'canceled'
        queueStatus = 'failed'
        break
    }

    // Update call log
    const callLogUpdate: any = {
      call_status: callStatus,
      duration_seconds: callDuration,
      voicemail_detected: voicemailDetected,
      voicemail_dropped: voicemailDropped,
      updated_at: new Date().toISOString()
    }

    if (outcome) {
      callLogUpdate.call_outcome = outcome
    }

    if (callStatus === 'completed' || callStatus === 'failed' || callStatus === 'canceled') {
      callLogUpdate.ended_at = new Date().toISOString()
    }

    // Log voicemail detection details
    if (voicemailDetected) {
      console.log('🎤 Voicemail detected - Duration:', machineDetectionDuration, 'Dropped:', voicemailDropped);
      callLogUpdate.notes = `Voicemail detected (${machineDetectionDuration}ms detection time)`
    }

    await supabase
      .from('call_logs')
      .update(callLogUpdate)
      .eq('id', callLogId)

    // Update auto_dial_queue based on outcome
    if (leadId) {
      const queueUpdate: any = {
        status: queueStatus,
        last_attempt_outcome: outcome,
        updated_at: new Date().toISOString()
      }

      // Schedule retry if needed
      if (shouldScheduleRetry) {
        // Get current queue record to check attempt count
        const { data: queueRecord } = await supabase
          .from('auto_dial_queue')
          .select('attempt_count, max_attempts')
          .eq('lead_id', leadId)
          .single()

        if (queueRecord && queueRecord.attempt_count < queueRecord.max_attempts) {
          // Schedule next attempt (progressive delay: 1hr, 4hr, 24hr)
          const delayHours = Math.pow(2, queueRecord.attempt_count) // 1, 2, 4, 8...
          const nextAttempt = new Date()
          nextAttempt.setHours(nextAttempt.getHours() + Math.min(delayHours, 24))
          
          queueUpdate.next_attempt_at = nextAttempt.toISOString()
          queueUpdate.status = 'queued'
        } else {
          queueUpdate.status = 'completed' // Max attempts reached
        }
      }

      await supabase
        .from('auto_dial_queue')
        .update(queueUpdate)
        .eq('lead_id', leadId)
    }

    // Update campaign stats if applicable
    if (outcome === 'answered') {
      const { data: callLog } = await supabase
        .from('call_logs')
        .select('campaign_id')
        .eq('id', callLogId)
        .single()

      if (callLog?.campaign_id) {
        await supabase
          .from('call_campaigns')
          .update({
            successful_connections: supabase.raw('successful_connections + 1'),
            updated_at: new Date().toISOString()
          })
          .eq('id', callLog.campaign_id)
      }
    }

    console.log('✅ Call status updated successfully');

    return new Response('OK', { headers: corsHeaders })

  } catch (error) {
    console.error('💥 CRITICAL ERROR in call-status-webhook:', error);
    return new Response(`Error: ${error.message}`, { 
      status: 500, 
      headers: corsHeaders 
    })
  }
})