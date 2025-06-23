
import { supabase } from '@/integrations/supabase/client';

interface OptimisticMessage {
  id: string;
  leadId: string;
  body: string;
  timestamp: number;
  status: 'sending' | 'sent' | 'failed';
}

class MessageStatusReconciliationService {
  private optimisticMessages = new Map<string, OptimisticMessage>();
  private reconciliationTimer: NodeJS.Timeout | null = null;

  // Add optimistic message
  addOptimisticMessage(message: OptimisticMessage) {
    console.log('📝 [RECONCILIATION] Adding optimistic message:', message.id);
    this.optimisticMessages.set(message.id, message);
    this.scheduleReconciliation();
  }

  // Update message status
  updateMessageStatus(messageId: string, status: 'sent' | 'failed', error?: string) {
    const message = this.optimisticMessages.get(messageId);
    if (message) {
      console.log('📊 [RECONCILIATION] Updating message status:', messageId, status);
      this.optimisticMessages.set(messageId, {
        ...message,
        status
      });

      // Remove successful messages after a delay
      if (status === 'sent') {
        setTimeout(() => {
          this.optimisticMessages.delete(messageId);
        }, 5000);
      }
    }
  }

  // Get messages that are stuck in sending state
  getStuckMessages(): OptimisticMessage[] {
    const now = Date.now();
    return Array.from(this.optimisticMessages.values()).filter(msg => 
      msg.status === 'sending' && (now - msg.timestamp) > 30000 // 30 seconds
    );
  }

  // Clear stuck messages
  clearStuckMessages() {
    const stuckMessages = this.getStuckMessages();
    console.log('🧹 [RECONCILIATION] Clearing stuck messages:', stuckMessages.length);
    
    stuckMessages.forEach(msg => {
      this.optimisticMessages.delete(msg.id);
    });

    return stuckMessages.length;
  }

  // Reconcile with actual database state
  private scheduleReconciliation() {
    if (this.reconciliationTimer) {
      clearTimeout(this.reconciliationTimer);
    }

    this.reconciliationTimer = setTimeout(async () => {
      await this.reconcileMessages();
    }, 10000); // Reconcile after 10 seconds
  }

  private async reconcileMessages() {
    const pendingMessages = Array.from(this.optimisticMessages.values()).filter(
      msg => msg.status === 'sending'
    );

    if (pendingMessages.length === 0) return;

    console.log('🔄 [RECONCILIATION] Reconciling messages:', pendingMessages.length);

    for (const message of pendingMessages) {
      try {
        // Check if message exists in database
        const { data, error } = await supabase
          .from('conversations')
          .select('id, sms_status')
          .eq('lead_id', message.leadId)
          .eq('body', message.body)
          .eq('direction', 'out')
          .gte('sent_at', new Date(message.timestamp - 60000).toISOString()) // Within 1 minute
          .order('sent_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('❌ [RECONCILIATION] Error checking message:', error);
          continue;
        }

        if (data && data.length > 0) {
          const dbMessage = data[0];
          const status = dbMessage.sms_status === 'sent' ? 'sent' : 
                        dbMessage.sms_status === 'failed' ? 'failed' : 'sending';
          
          this.updateMessageStatus(message.id, status);
        } else {
          // Message not found in DB after reasonable time - mark as failed
          const timeSinceCreation = Date.now() - message.timestamp;
          if (timeSinceCreation > 60000) { // 1 minute
            console.warn('⚠️ [RECONCILIATION] Message not found in DB, marking as failed:', message.id);
            this.updateMessageStatus(message.id, 'failed');
          }
        }
      } catch (error) {
        console.error('❌ [RECONCILIATION] Error during reconciliation:', error);
      }
    }
  }

  // Get all optimistic messages for a lead
  getOptimisticMessagesForLead(leadId: string): OptimisticMessage[] {
    return Array.from(this.optimisticMessages.values()).filter(msg => msg.leadId === leadId);
  }

  // Force reconciliation
  async forceReconciliation() {
    console.log('🔄 [RECONCILIATION] Force reconciliation requested');
    await this.reconcileMessages();
  }
}

export const messageStatusReconciliation = new MessageStatusReconciliationService();
