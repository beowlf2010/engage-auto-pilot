
import { supabase } from '@/integrations/supabase/client';
import { enhancedMessageContextLoader } from './enhancedMessageContextLoader';
import { intelligentAIResponseGenerator } from './intelligentAIResponseGenerator';

export class RealtimeMessageProcessor {
  private processingQueue = new Set<string>();
  private lastProcessedTimes = new Map<string, number>();

  async processNewCustomerMessage(leadId: string, messageBody: string): Promise<boolean> {
    // Prevent duplicate processing
    if (this.processingQueue.has(leadId)) {
      console.log('🚫 [REALTIME] Already processing message for lead:', leadId);
      return false;
    }

    // Debounce rapid messages (wait at least 2 seconds between processing)
    const lastProcessed = this.lastProcessedTimes.get(leadId) || 0;
    const now = Date.now();
    if (now - lastProcessed < 2000) {
      console.log('⏱️ [REALTIME] Throttling message processing for lead:', leadId);
      return false;
    }

    this.processingQueue.add(leadId);
    this.lastProcessedTimes.set(leadId, now);

    try {
      console.log('🚀 [REALTIME] Processing new customer message for lead:', leadId);
      console.log('📝 [REALTIME] Message preview:', messageBody.substring(0, 100) + '...');

      // Check if lead has AI opt-in
      const shouldProcess = await this.shouldProcessAIResponse(leadId);
      if (!shouldProcess) {
        console.log('🚫 [REALTIME] AI processing disabled for lead:', leadId);
        return false;
      }

      // Load full conversation context
      const context = await enhancedMessageContextLoader.loadFullConversationContext(leadId);
      if (!context) {
        console.error('❌ [REALTIME] Failed to load conversation context');
        return false;
      }

      // Generate intelligent response
      const aiResponse = await intelligentAIResponseGenerator.generateContextualResponse(context);
      if (!aiResponse) {
        console.error('❌ [REALTIME] Failed to generate AI response');
        return false;
      }

      // Send the response
      const success = await this.sendAIResponse(leadId, aiResponse.message);
      
      if (success) {
        console.log('✅ [REALTIME] Successfully processed and sent AI response');
        console.log('📤 [REALTIME] Response preview:', aiResponse.message.substring(0, 100) + '...');
        return true;
      } else {
        console.error('❌ [REALTIME] Failed to send AI response');
        return false;
      }

    } catch (error) {
      console.error('❌ [REALTIME] Error processing message:', error);
      return false;
    } finally {
      this.processingQueue.delete(leadId);
    }
  }

  private async shouldProcessAIResponse(leadId: string): Promise<boolean> {
    try {
      const { data: lead } = await supabase
        .from('leads')
        .select('ai_opt_in, status')
        .eq('id', leadId)
        .single();

      if (!lead) return false;

      // Don't process if AI is disabled or lead is closed
      if (lead.ai_opt_in === false) return false;
      if (lead.status && ['lost', 'closed', 'sold'].includes(lead.status.toLowerCase())) return false;

      return true;
    } catch (error) {
      console.error('❌ [REALTIME] Error checking AI opt-in:', error);
      return false;
    }
  }

  private async sendAIResponse(leadId: string, messageContent: string): Promise<boolean> {
    try {
      // Use the consolidated message service
      const { sendMessage } = await import('./messagesService');
      
      const result = await sendMessage(leadId, messageContent, null, true);
      return result.success;
    } catch (error) {
      console.error('❌ [REALTIME] Error sending AI response:', error);
      return false;
    }
  }

  // Setup realtime listener for new messages
  setupRealtimeListener(): () => void {
    console.log('🔗 [REALTIME] Setting up message listener');

    const channel = supabase
      .channel('realtime-message-processing')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations'
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Only process incoming customer messages
          if (newMessage.direction === 'in' && !newMessage.ai_generated) {
            console.log('📨 [REALTIME] New customer message received:', newMessage.lead_id);
            
            // Process with slight delay to ensure message is fully written
            setTimeout(() => {
              this.processNewCustomerMessage(newMessage.lead_id, newMessage.body);
            }, 1000);
          }
        }
      )
      .subscribe();

    // Return cleanup function
    return () => {
      console.log('🔌 [REALTIME] Cleaning up message listener');
      supabase.removeChannel(channel);
    };
  }
}

export const realtimeMessageProcessor = new RealtimeMessageProcessor();
