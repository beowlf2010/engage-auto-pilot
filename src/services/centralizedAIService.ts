
import { supabase } from '@/integrations/supabase/client';
import { generateIntelligentResponse, type ConversationContext } from './intelligentConversationAI';

interface LeadContext {
  id: string;
  firstName: string;
  lastName: string;
  vehicleInterest: string;
  phone: string;
  aiStage: string;
  messagesSent: number;
  lastReplyAt?: string;
}

interface ConversationMessage {
  id: string;
  body: string;
  direction: 'in' | 'out';
  sentAt: string;
  aiGenerated?: boolean;
}

// Central AI service to coordinate all AI message generation with duplicate prevention
export class CentralizedAIService {
  private static instance: CentralizedAIService;
  private isGenerating = new Set<string>();
  private recentlyProcessed = new Map<string, number>(); // leadId -> timestamp

  static getInstance(): CentralizedAIService {
    if (!CentralizedAIService.instance) {
      CentralizedAIService.instance = new CentralizedAIService();
    }
    return CentralizedAIService.instance;
  }

  // Enhanced duplicate prevention - check if we should generate a response
  async shouldGenerateResponse(leadId: string): Promise<boolean> {
    if (this.isGenerating.has(leadId)) {
      console.log(`🔒 AI already generating for lead ${leadId}`);
      return false;
    }

    // Check if we recently processed this lead (within last 30 seconds)
    const lastProcessed = this.recentlyProcessed.get(leadId);
    const now = Date.now();
    if (lastProcessed && (now - lastProcessed) < 30000) {
      console.log(`⏱️ Recently processed lead ${leadId}, skipping to prevent duplicates`);
      return false;
    }

    // Get the lead's conversation context
    const context = await this.getConversationContext(leadId);
    if (!context) return false;

    // Check if there's an unresponded customer message
    const lastCustomerMessage = context.messages
      .filter(msg => msg.direction === 'in')
      .slice(-1)[0];

    if (!lastCustomerMessage) return false;

    // Check if we've already responded to this message
    const messagesAfterCustomer = context.messages.filter(msg => 
      new Date(msg.sentAt) > new Date(lastCustomerMessage.sentAt) && 
      msg.direction === 'out'
    );

    const shouldGenerate = messagesAfterCustomer.length === 0;
    
    if (shouldGenerate) {
      console.log(`✅ Should generate response for lead ${leadId} - unresponded customer message found`);
    } else {
      console.log(`⏭️ Skipping lead ${leadId} - already responded to latest customer message`);
    }

    return shouldGenerate;
  }

  // Generate intelligent response using our enhanced system with duplicate prevention
  async generateResponse(leadId: string): Promise<string | null> {
    if (this.isGenerating.has(leadId)) {
      console.log(`🔒 Already generating response for lead ${leadId}`);
      return null;
    }

    this.isGenerating.add(leadId);

    try {
      console.log(`🤖 Generating centralized AI response for lead ${leadId}`);

      const context = await this.getConversationContext(leadId);
      if (!context) {
        console.log(`❌ No context available for lead ${leadId}`);
        return null;
      }

      // Use our intelligent conversation AI service (Tesla-aware)
      const response = await generateIntelligentResponse(context);
      
      if (response) {
        console.log(`✅ Generated intelligent response: ${response.message}`);
        
        // Mark as recently processed to prevent duplicates
        this.recentlyProcessed.set(leadId, Date.now());
        
        // Clean up old entries (older than 5 minutes)
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        for (const [id, timestamp] of this.recentlyProcessed.entries()) {
          if (timestamp < fiveMinutesAgo) {
            this.recentlyProcessed.delete(id);
          }
        }
        
        return response.message;
      }

      return null;
    } catch (error) {
      console.error(`❌ Error generating AI response for lead ${leadId}:`, error);
      return null;
    } finally {
      this.isGenerating.delete(leadId);
    }
  }

  // Get full conversation context for a lead
  private async getConversationContext(leadId: string): Promise<ConversationContext | null> {
    try {
      // Get lead details
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select(`
          id,
          first_name,
          last_name,
          vehicle_interest,
          ai_stage,
          ai_messages_sent,
          last_reply_at,
          phone_numbers (number, is_primary)
        `)
        .eq('id', leadId)
        .single();

      if (leadError || !lead) {
        console.error('Error fetching lead:', leadError);
        return null;
      }

      // Get conversation messages
      const { data: messages, error: messagesError } = await supabase
        .from('conversations')
        .select('id, body, direction, sent_at, ai_generated')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: true });

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        return null;
      }

      // Transform messages to expected format
      const conversationMessages: ConversationMessage[] = messages?.map(msg => ({
        id: msg.id,
        body: msg.body,
        direction: msg.direction as 'in' | 'out',
        sentAt: msg.sent_at,
        aiGenerated: msg.ai_generated || false
      })) || [];

      return {
        leadId: lead.id,
        leadName: `${lead.first_name} ${lead.last_name}`,
        vehicleInterest: lead.vehicle_interest,
        messages: conversationMessages,
        leadInfo: {
          phone: lead.phone_numbers?.find(p => p.is_primary)?.number || '',
          status: lead.ai_stage || 'initial',
          lastReplyAt: lead.last_reply_at
        }
      };
    } catch (error) {
      console.error('Error getting conversation context:', error);
      return null;
    }
  }

  // Mark an AI response as processed to prevent duplicates
  markResponseProcessed(leadId: string, messageContent: string): void {
    console.log(`✅ Marked response processed for lead ${leadId}`);
    this.recentlyProcessed.set(leadId, Date.now());
  }
}

// Export singleton instance
export const centralizedAI = CentralizedAIService.getInstance();
