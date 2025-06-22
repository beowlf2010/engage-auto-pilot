
import { supabase } from '@/integrations/supabase/client';
import { generateEnhancedIntelligentResponse } from './intelligentConversationAI';
import { leadSourceStrategy } from './leadSourceStrategy';

class CentralizedAIService {
  private processedMessages = new Set<string>();

  async shouldGenerateResponse(leadId: string): Promise<boolean> {
    try {
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
        return false;
      }

      // Check if there's already a response after this customer message
      const responseAfter = messages.find(msg => 
        msg.direction === 'out' && 
        new Date(msg.sent_at) > new Date(lastCustomerMessage.sent_at)
      );

      return !responseAfter;
    } catch (error) {
      console.error('Error checking if response needed:', error);
      return false;
    }
  }

  async generateResponse(leadId: string): Promise<string | null> {
    try {
      // Get lead data with source information
      const { data: lead } = await supabase
        .from('leads')
        .select('first_name, last_name, vehicle_interest, source')
        .eq('id', leadId)
        .single();

      if (!lead) return null;

      // Get conversation history
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: true })
        .limit(20);

      if (!conversations || conversations.length === 0) return null;

      // Get the last customer message
      const lastCustomerMessage = conversations
        .filter(msg => msg.direction === 'in')
        .slice(-1)[0];

      if (!lastCustomerMessage) return null;

      // Format messages for AI with proper type casting
      const formattedMessages = conversations.map(msg => ({
        id: msg.id,
        body: msg.body,
        direction: msg.direction as 'in' | 'out',
        sentAt: msg.sent_at,
        aiGenerated: msg.ai_generated
      }));

      // Get lead source data
      const leadSourceData = lead.source 
        ? leadSourceStrategy.getLeadSourceData(lead.source)
        : undefined;

      // Create enhanced context with source awareness
      const context = {
        leadId,
        leadName: `${lead.first_name} ${lead.last_name}`,
        vehicleInterest: lead.vehicle_interest || '',
        leadSource: lead.source,
        leadSourceData: leadSourceData,
        messages: formattedMessages,
        leadInfo: {
          phone: '', // Will be populated from phone_numbers table if needed
          status: 'active',
          lastReplyAt: lastCustomerMessage.sent_at
        }
      };

      // Generate enhanced response with source awareness
      const aiResponse = await generateEnhancedIntelligentResponse(context);

      if (aiResponse?.message) {
        // Mark this message as processed
        this.processedMessages.add(lastCustomerMessage.id);
        console.log(`🤖 Generated source-aware AI response for lead ${leadId}:`, aiResponse.message);
        console.log(`📍 Source strategy used:`, aiResponse.sourceStrategy || 'general');
        
        return aiResponse.message;
      }

      return null;
    } catch (error) {
      console.error('Error generating source-aware AI response:', error);
      return null;
    }
  }

  markResponseProcessed(leadId: string, message: string): void {
    console.log(`✅ Marked source-aware AI response as processed for lead ${leadId}`);
  }

  // Process incoming message for basic tracking
  async processIncomingMessage(leadId: string, conversationId: string, messageBody: string): Promise<void> {
    try {
      console.log(`Processing incoming message for lead ${leadId}`);
      
      // Get lead source for context
      const { data: lead } = await supabase
        .from('leads')
        .select('source')
        .eq('id', leadId)
        .single();
        
      if (lead?.source) {
        const sourceData = leadSourceStrategy.getLeadSourceData(lead.source);
        console.log(`📍 Message from ${sourceData.sourceCategory} source (${lead.source})`);
      }
    } catch (error) {
      console.error('Error processing incoming message:', error);
    }
  }
}

export const centralizedAI = new CentralizedAIService();
