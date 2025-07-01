
import { supabase } from '@/integrations/supabase/client';
import { aiServiceGuard, AI_SERVICE_IDS } from './aiServiceGuard';

// The ONLY AI service that should generate responses - prevents conflicts and repetitive introductions
class ConsolidatedAIService {
  private processedMessages = new Set<string>();
  private isProcessing = false;
  private readonly serviceId = AI_SERVICE_IDS.CONSOLIDATED;

  async shouldGenerateResponse(leadId: string): Promise<boolean> {
    try {
      // First check with the guard system
      if (!aiServiceGuard.canGenerateResponse(leadId, this.serviceId)) {
        return false;
      }

      // Get recent messages for this lead
      const { data: messages } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: false })
        .limit(10);

      if (!messages || messages.length === 0) return false;

      // Find the last customer message
      const lastCustomerMessage = messages.find(msg => msg.direction === 'in');
      if (!lastCustomerMessage) return false;

      // Check if we already processed this message
      if (this.processedMessages.has(lastCustomerMessage.id)) {
        console.log('🚫 [CONSOLIDATED AI] Message already processed:', lastCustomerMessage.id);
        return false;
      }

      // Check if there's already a response after this customer message
      const responseAfter = messages.find(msg => 
        msg.direction === 'out' && 
        new Date(msg.sent_at) > new Date(lastCustomerMessage.sent_at)
      );

      if (responseAfter) {
        console.log('🚫 [CONSOLIDATED AI] Response already exists after customer message');
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ [CONSOLIDATED AI] Error checking if response needed:', error);
      return false;
    }
  }

  async generateResponse(leadId: string): Promise<string | null> {
    // Prevent concurrent processing for the same lead
    if (this.isProcessing) {
      console.log('🚫 [CONSOLIDATED AI] Already processing, skipping');
      return null;
    }

    // Register with guard system
    if (!aiServiceGuard.canGenerateResponse(leadId, this.serviceId)) {
      return null;
    }

    aiServiceGuard.registerResponseGeneration(leadId, this.serviceId);
    this.isProcessing = true;

    try {
      console.log('🤖 [CONSOLIDATED AI] Generating conversation-aware response for lead:', leadId);

      // Get lead data
      const { data: lead } = await supabase
        .from('leads')
        .select('first_name, last_name, vehicle_interest, source')
        .eq('id', leadId)
        .single();

      if (!lead) {
        console.log('❌ [CONSOLIDATED AI] Lead not found:', leadId);
        return null;
      }

      // Get conversation history
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: true })
        .limit(20);

      if (!conversations || conversations.length === 0) {
        console.log('❌ [CONSOLIDATED AI] No conversations found for lead:', leadId);
        return null;
      }

      // Get the last customer message
      const lastCustomerMessage = conversations
        .filter(msg => msg.direction === 'in')
        .slice(-1)[0];

      if (!lastCustomerMessage) {
        console.log('❌ [CONSOLIDATED AI] No customer message found');
        return null;
      }

      // Format conversation history for the edge function
      const conversationHistory = conversations
        .map(msg => `${msg.direction === 'in' ? 'Customer' : 'You'}: ${msg.body}`)
        .join('\n');

      console.log('📞 [CONSOLIDATED AI] Calling intelligent-conversation-ai with direct message context');
      console.log('📝 [CONSOLIDATED AI] Customer message:', lastCustomerMessage.body.substring(0, 100) + '...');

      // Call the conversation-aware edge function with the actual customer message
      const { data: aiResponse, error: aiError } = await supabase.functions.invoke('intelligent-conversation-ai', {
        body: {
          leadId,
          leadName: `${lead.first_name} ${lead.last_name}`,
          messageBody: lastCustomerMessage.body, // Pass the actual customer message
          latestCustomerMessage: lastCustomerMessage.body, // Alternative parameter
          conversationHistory,
          hasConversationalSignals: false,
          leadSource: lead.source,
          leadSourceData: null,
          vehicleInterest: lead.vehicle_interest || ''
        }
      });

      if (aiError) {
        console.error('❌ [CONSOLIDATED AI] Edge function error:', aiError);
        return null;
      }

      if (aiResponse?.message) {
        // Mark this message as processed
        this.processedMessages.add(lastCustomerMessage.id);
        console.log(`✅ [CONSOLIDATED AI] Generated contextual response:`, aiResponse.message.substring(0, 100) + '...');
        console.log(`🎯 [CONSOLIDATED AI] Response reasoning:`, aiResponse.reasoning);
        
        return aiResponse.message;
      } else {
        console.log('❌ [CONSOLIDATED AI] No response generated from edge function');
        return null;
      }

    } catch (error) {
      console.error('❌ [CONSOLIDATED AI] Error generating response:', error);
      return null;
    } finally {
      aiServiceGuard.completeResponse(leadId, this.serviceId);
      this.isProcessing = false;
    }
  }

  // Process all leads that need responses
  async processAllPendingResponses(profile: any): Promise<void> {
    if (!profile) return;

    try {
      console.log('🔄 [CONSOLIDATED AI] Processing all pending responses...');

      // Get leads with recent incoming messages that need responses
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
        .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('sent_at', { ascending: false });

      if (!leadsWithMessages || leadsWithMessages.length === 0) {
        console.log('📭 [CONSOLIDATED AI] No recent messages found');
        return;
      }

      // Get unique lead IDs
      const uniqueLeadIds = [...new Set(leadsWithMessages.map(msg => msg.lead_id))];
      console.log(`📬 [CONSOLIDATED AI] Found ${uniqueLeadIds.length} leads with recent messages`);

      // Process each lead
      for (const leadId of uniqueLeadIds.slice(0, 5)) { // Limit to 5 to prevent overwhelming
        try {
          const shouldRespond = await this.shouldGenerateResponse(leadId);
          if (shouldRespond) {
            const response = await this.generateResponse(leadId);
            if (response) {
              console.log(`✅ [CONSOLIDATED AI] Generated response for lead ${leadId}`);
              
              // Small delay between responses
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        } catch (error) {
          console.error(`❌ [CONSOLIDATED AI] Error processing lead ${leadId}:`, error);
        }
      }

    } catch (error) {
      console.error('❌ [CONSOLIDATED AI] Error processing pending responses:', error);
    }
  }

  // Clean up processed messages older than 24 hours
  cleanupProcessedMessages(): void {
    // Keep the set manageable by clearing it periodically
    if (this.processedMessages.size > 1000) {
      console.log('🧹 [CONSOLIDATED AI] Cleaning up processed messages cache');
      this.processedMessages.clear();
    }
  }

  // Get service status for debugging
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

// Export the single instance - this is the ONLY AI service that should be used
export const consolidatedAI = new ConsolidatedAIService();
