import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSPipelineHealth {
  totalPending: number;
  totalFailed: number;
  totalSent: number;
  oldestPending?: string;
  recentFailures: Array<{
    id: string;
    lead_id: string;
    error: string;
    created_at: string;
  }>;
  healthScore: number;
}

const getHealthStatus = async (supabase: any): Promise<SMSPipelineHealth> => {
  console.log('🔍 [SMS MAINTENANCE] Checking SMS pipeline health...');

  // Get conversation status counts
  const { data: statusCounts } = await supabase
    .from('conversations')
    .select('sms_status')
    .eq('direction', 'out')
    .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

  const totalPending = statusCounts?.filter((c: any) => c.sms_status === 'pending').length || 0;
  const totalFailed = statusCounts?.filter((c: any) => c.sms_status === 'failed').length || 0;
  const totalSent = statusCounts?.filter((c: any) => c.sms_status === 'sent').length || 0;

  // Get oldest pending message
  const { data: oldestPendingData } = await supabase
    .from('conversations')
    .select('sent_at')
    .eq('direction', 'out')
    .eq('sms_status', 'pending')
    .order('sent_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  // Get recent failures
  const { data: recentFailures } = await supabase
    .from('conversations')
    .select('id, lead_id, sms_error, created_at')
    .eq('direction', 'out')
    .eq('sms_status', 'failed')
    .gte('sent_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
    .order('sent_at', { ascending: false })
    .limit(10);

  // Calculate health score (0-100)
  const totalMessages = totalPending + totalFailed + totalSent;
  let healthScore = 100;
  
  if (totalMessages > 0) {
    const failureRate = totalFailed / totalMessages;
    const pendingRate = totalPending / totalMessages;
    
    healthScore = Math.max(0, 100 - (failureRate * 70) - (pendingRate * 30));
  }

  return {
    totalPending,
    totalFailed,
    totalSent,
    oldestPending: oldestPendingData?.sent_at,
    recentFailures: recentFailures?.map((f: any) => ({
      id: f.id,
      lead_id: f.lead_id,
      error: f.sms_error || 'Unknown error',
      created_at: f.created_at
    })) || [],
    healthScore: Math.round(healthScore)
  };
};

const cleanupOldPendingMessages = async (supabase: any): Promise<number> => {
  console.log('🧹 [SMS MAINTENANCE] Cleaning up old pending messages...');

  // Mark messages older than 30 minutes as failed
  const cutoffTime = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  
  const { data: oldPendingMessages } = await supabase
    .from('conversations')
    .select('id')
    .eq('direction', 'out')
    .eq('sms_status', 'pending')
    .lt('sent_at', cutoffTime);

  if (!oldPendingMessages || oldPendingMessages.length === 0) {
    return 0;
  }

  const { error } = await supabase
    .from('conversations')
    .update({
      sms_status: 'failed',
      sms_error: 'Timeout - message stuck in pending state for over 30 minutes'
    })
    .in('id', oldPendingMessages.map((m: any) => m.id));

  if (error) {
    console.error('❌ [SMS MAINTENANCE] Error cleaning up pending messages:', error);
    return 0;
  }

  console.log(`🧹 [SMS MAINTENANCE] Cleaned up ${oldPendingMessages.length} stuck pending messages`);
  return oldPendingMessages.length;
};

const retryFailedMessages = async (supabase: any, limit: number = 10): Promise<number> => {
  console.log(`🔄 [SMS MAINTENANCE] Retrying failed messages (limit: ${limit})...`);

  // Get failed messages from the last hour that haven't been retried too many times
  const { data: failedMessages } = await supabase
    .from('conversations')
    .select('id, lead_id, body, sms_error')
    .eq('direction', 'out')
    .eq('sms_status', 'failed')
    .gte('sent_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .not('sms_error', 'ilike', '%retried%')
    .order('sent_at', { ascending: true })
    .limit(limit);

  if (!failedMessages || failedMessages.length === 0) {
    console.log('✅ [SMS MAINTENANCE] No failed messages to retry');
    return 0;
  }

  let retriedCount = 0;

  for (const message of failedMessages) {
    try {
      // Get lead's phone number
      const { data: phoneData } = await supabase
        .from('phone_numbers')
        .select('number')
        .eq('lead_id', message.lead_id)
        .eq('is_primary', true)
        .maybeSingle();

      if (!phoneData) {
        console.warn(`⚠️ [SMS MAINTENANCE] No phone number for lead ${message.lead_id}`);
        continue;
      }

      // Retry sending via SMS function
      const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-sms', {
        body: {
          to: phoneData.number,
          message: message.body,
          conversationId: message.id
        }
      });

      if (smsError || !smsResult?.success) {
        // Mark as retried but failed
        await supabase
          .from('conversations')
          .update({ 
            sms_error: `${message.sms_error} | Retried: ${smsError?.message || smsResult?.error || 'Unknown retry error'}`
          })
          .eq('id', message.id);
      } else {
        // Success!
        await supabase
          .from('conversations')
          .update({
            sms_status: 'sent',
            twilio_message_id: smsResult.messageSid,
            sms_error: null
          })
          .eq('id', message.id);
        
        retriedCount++;
        console.log(`✅ [SMS MAINTENANCE] Successfully retried message ${message.id}`);
      }

    } catch (retryError) {
      console.error(`❌ [SMS MAINTENANCE] Error retrying message ${message.id}:`, retryError);
    }
  }

  console.log(`🔄 [SMS MAINTENANCE] Retry complete: ${retriedCount}/${failedMessages.length} messages fixed`);
  return retriedCount;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔧 [SMS MAINTENANCE] Starting SMS pipeline maintenance...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const healthBefore = await getHealthStatus(supabase);
    console.log('📊 [SMS MAINTENANCE] Health before maintenance:', healthBefore);

    const messagesCleaned = await cleanupOldPendingMessages(supabase);
    const messagesRetried = await retryFailedMessages(supabase);

    const healthAfter = await getHealthStatus(supabase);
    console.log('📊 [SMS MAINTENANCE] Health after maintenance:', healthAfter);

    const result = {
      success: true,
      healthBefore,
      healthAfter,
      messagesRetried,
      messagesCleaned,
      healthImprovement: healthAfter.healthScore - healthBefore.healthScore,
      timestamp: new Date().toISOString()
    };

    console.log('✅ [SMS MAINTENANCE] Maintenance complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ [SMS MAINTENANCE] Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});