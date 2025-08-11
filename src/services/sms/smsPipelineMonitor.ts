import { supabase } from '@/integrations/supabase/client';

export interface SMSPipelineHealth {
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

export class SMSPipelineMonitor {
  
  async getHealthStatus(): Promise<SMSPipelineHealth> {
    try {
      console.log('🔍 [SMS MONITOR] Checking SMS pipeline health...');

      // Get conversation status counts
      const { data: statusCounts } = await supabase
        .from('conversations')
        .select('sms_status')
        .eq('direction', 'out')
        .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

      const totalPending = statusCounts?.filter(c => c.sms_status === 'pending').length || 0;
      const totalFailed = statusCounts?.filter(c => c.sms_status === 'failed').length || 0;
      const totalSent = statusCounts?.filter(c => c.sms_status === 'sent').length || 0;

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
        .limit(5);

      // Calculate health score (0-100)
      const totalMessages = totalPending + totalFailed + totalSent;
      let healthScore = 100;
      
      if (totalMessages > 0) {
        const failureRate = totalFailed / totalMessages;
        const pendingRate = totalPending / totalMessages;
        
        healthScore = Math.max(0, 100 - (failureRate * 70) - (pendingRate * 30));
      }

      const health: SMSPipelineHealth = {
        totalPending,
        totalFailed,
        totalSent,
        oldestPending: oldestPendingData?.sent_at,
        recentFailures: recentFailures?.map(f => ({
          id: f.id,
          lead_id: f.lead_id,
          error: f.sms_error || 'Unknown error',
          created_at: f.created_at
        })) || [],
        healthScore: Math.round(healthScore)
      };

      console.log('📊 [SMS MONITOR] Pipeline health:', health);
      return health;

    } catch (error) {
      console.error('❌ [SMS MONITOR] Error checking health:', error);
      return {
        totalPending: 0,
        totalFailed: 0,
        totalSent: 0,
        recentFailures: [],
        healthScore: 0
      };
    }
  }

  async retryFailedMessages(limit: number = 10): Promise<number> {
    try {
      console.log(`🔄 [SMS MONITOR] Retrying failed messages (limit: ${limit})...`);

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
        console.log('✅ [SMS MONITOR] No failed messages to retry');
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
            console.warn(`⚠️ [SMS MONITOR] No phone number for lead ${message.lead_id}`);
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
            console.log(`✅ [SMS MONITOR] Successfully retried message ${message.id}`);
          }

        } catch (retryError) {
          console.error(`❌ [SMS MONITOR] Error retrying message ${message.id}:`, retryError);
        }
      }

      console.log(`🔄 [SMS MONITOR] Retry complete: ${retriedCount}/${failedMessages.length} messages fixed`);
      return retriedCount;

    } catch (error) {
      console.error('❌ [SMS MONITOR] Error in retry process:', error);
      return 0;
    }
  }

  async cleanupOldPendingMessages(): Promise<number> {
    try {
      console.log('🧹 [SMS MONITOR] Cleaning up old pending messages...');

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
        .in('id', oldPendingMessages.map(m => m.id));

      if (error) {
        console.error('❌ [SMS MONITOR] Error cleaning up pending messages:', error);
        return 0;
      }

      console.log(`🧹 [SMS MONITOR] Cleaned up ${oldPendingMessages.length} stuck pending messages`);
      return oldPendingMessages.length;

    } catch (error) {
      console.error('❌ [SMS MONITOR] Error in cleanup:', error);
      return 0;
    }
  }

  async performMaintenance(): Promise<{
    healthBefore: SMSPipelineHealth;
    healthAfter: SMSPipelineHealth;
    messagesRetried: number;
    messagesCleaned: number;
  }> {
    try {
      console.log('🔧 [SMS MONITOR] Starting pipeline maintenance...');

      const healthBefore = await this.getHealthStatus();
      
      const messagesCleaned = await this.cleanupOldPendingMessages();
      const messagesRetried = await this.retryFailedMessages();
      
      const healthAfter = await this.getHealthStatus();

      console.log('✅ [SMS MONITOR] Maintenance complete:', {
        healthImprovement: healthAfter.healthScore - healthBefore.healthScore,
        messagesRetried,
        messagesCleaned
      });

      return {
        healthBefore,
        healthAfter,
        messagesRetried,
        messagesCleaned
      };

    } catch (error) {
      console.error('❌ [SMS MONITOR] Error in maintenance:', error);
      throw error;
    }
  }
}

export const smsPipelineMonitor = new SMSPipelineMonitor();