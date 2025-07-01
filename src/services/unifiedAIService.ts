import { supabase } from '@/integrations/supabase/client';
import { aiServiceGuard, AI_SERVICE_IDS } from './aiServiceGuard';
import { unifiedAIResponseEngine, MessageContext, UnifiedAIResponse } from './unifiedAIResponseEngine';

class UnifiedAIService {
  private processedMessages = new Set<string>();
  private isProcessing = false;
  private readonly serviceId = AI_SERVICE_IDS.CONSOLIDATED;

  async shouldGenerateResponse(leadId: string): Promise<boolean> {
    try {
      if (!aiServiceGuard.canGenerateResponse(leadId, this.serviceId)) {
        return false;
      }

      const { data: messages } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: false })
        .limit(10);

      if (!messages || messages.length === 0) return false;

      const lastCustomerMessage = messages.find(msg => msg.direction === 'in');
      if (!lastCustomerMessage) return false;

      if (this.processedMessages.has(lastCustomerMessage.id)) {
        console.log('🚫 [UNIFIED AI] Message already processed:', lastCustomerMessage.id);
        return false;
      }

      const responseAfter = messages.find(msg => 
        msg.direction === 'out' && 
        new Date(msg.sent_at) > new Date(lastCustomerMessage.sent_at)
      );

      if (responseAfter) {
        console.log('🚫 [UNIFIED AI] Response already exists after customer message');
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ [UNIFIED AI] Error checking if response needed:', error);
      return false;
    }
  }

  async generateResponse(leadId: string): Promise<string | null> {
    if (this.isProcessing) {
      console.log('🚫 [UNIFIED AI] Already processing, skipping');
      return null;
    }

    if (!aiServiceGuard.canGenerateResponse(leadId, this.serviceId)) {
      return null;
    }

    aiServiceGuard.registerResponseGeneration(leadId, this.serviceId);
    this.isProcessing = true;

    try {
      console.log('🤖 [UNIFIED AI] Generating response for lead:', leadId);

      const { data: lead } = await supabase
        .from('leads')
        .select('first_name, last_name, vehicle_interest, source')
        .eq('id', leadId)
        .single();

      if (!lead) {
        console.log('❌ [UNIFIED AI] Lead not found:', leadId);
        return null;
      }

      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: true })
        .limit(20);

      if (!conversations || conversations.length === 0) {
        console.log('❌ [UNIFIED AI] No conversations found for lead:', leadId);
        return null;
      }

      const lastCustomerMessage = conversations
        .filter(msg => msg.direction === 'in')
        .slice(-1)[0];

      if (!lastCustomerMessage) {
        console.log('❌ [UNIFIED AI] No customer message found');
        return null;
      }

      console.log('📨 [UNIFIED AI] Processing customer message:', lastCustomerMessage.body.substring(0, 100));

      const messageContext: MessageContext = {
        leadId,
        leadName: `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'there',
        latestMessage: lastCustomerMessage.body,
        conversationHistory: conversations.map(c => c.body),
        vehicleInterest: lead.vehicle_interest
      };

      const response: UnifiedAIResponse = unifiedAIResponseEngine.generateResponse(messageContext);

      if (response.message) {
        this.processedMessages.add(lastCustomerMessage.id);
        
        console.log(`✅ [UNIFIED AI] Generated response:`, {
          intent: response.intent.primary,
          strategy: response.responseStrategy,
          confidence: response.confidence,
          message: response.message.substring(0, 100) + '...'
        });
        
        return response.message;
      }

      // Fallback to edge function if needed
      console.log('🔄 [UNIFIED AI] Falling back to edge function...');
      
      const { data: aiResponse, error: aiError } = await supabase.functions.invoke('intelligent-conversation-ai', {
        body: {
          leadId,
          leadName: messageContext.leadName,
          messageBody: lastCustomerMessage.body,
          latestCustomerMessage: lastCustomerMessage.body,
          conversationHistory: conversations.map(c => `${c.direction === 'in' ? 'Customer' : 'You'}: ${c.body}`).join('\n'),
          hasConversationalSignals: false,
          leadSource: lead.source,
          leadSourceData: null,
          vehicleInterest: lead.vehicle_interest || ''
        }
      });

      if (aiError) {
        console.error('❌ [UNIFIED AI] Edge function error:', aiError);
        return null;
      }

      if (aiResponse?.message) {
        this.processedMessages.add(lastCustomerMessage.id);
        console.log(`✅ [UNIFIED AI] Generated fallback response:`, aiResponse.message.substring(0, 100) + '...');
        return aiResponse.message;
      }

      return null;

    } catch (error) {
      console.error('❌ [UNIFIED AI] Error generating response:', error);
      return null;
    } finally {
      aiServiceGuard.completeResponse(leadId, this.serviceId);
      this.isProcessing = false;
    }
  }

  async processAllPendingResponses(profile: any): Promise<void> {
    if (!profile) return;

    try {
      console.log('🔄 [UNIFIED AI] Processing all pending responses...');

      const { data: leadsWithMessages } = await supabase
        .from('conversations')
        .select(`
          lead_id,
          direction,
          sent_at,
          leads!inner (
            first_name,
            last_name,
            ai_opt_in
          )
        `)
        .eq('direction', 'in')
        .eq('leads.ai_opt_in', true)
        .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('sent_at', { ascending: false });

      if (!leadsWithMessages || leadsWithMessages.length === 0) {
        console.log('📭 [UNIFIED AI] No recent messages found');
        return;
      }

      const uniqueLeadIds = [...new Set(leadsWithMessages.map(msg => msg.lead_id))];
      console.log(`📬 [UNIFIED AI] Found ${uniqueLeadIds.length} leads with recent messages`);

      for (const leadId of uniqueLeadIds.slice(0, 5)) {
        try {
          const shouldRespond = await this.shouldGenerateResponse(leadId);
          if (shouldRespond) {
            const response = await this.generateResponse(leadId);
            if (response) {
              console.log(`✅ [UNIFIED AI] Generated response for lead ${leadId}`);
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        } catch (error) {
          console.error(`❌ [UNIFIED AI] Error processing lead ${leadId}:`, error);
        }
      }

    } catch (error) {
      console.error('❌ [UNIFIED AI] Error processing pending responses:', error);
    }
  }

  cleanupProcessedMessages(): void {
    if (this.processedMessages.size > 1000) {
      console.log('🧹 [UNIFIED AI] Cleaning up processed messages cache');
      this.processedMessages.clear();
    }
  }

  getServiceStatus(): {
    processedCount: number;
    isProcessing: boolean;
  } {
    return {
      processedCount: this.processedMessages.size,
      isProcessing: this.isProcessing
    };
  }
}

export const unifiedAI = new UnifiedAIService();
