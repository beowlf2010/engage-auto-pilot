
import { supabase } from '@/integrations/supabase/client';

export interface ConversationContext {
  leadId: string;
  leadName: string;
  vehicleInterest: string;
  messages: Array<{
    content: string;
    direction: 'in' | 'out';
    sentAt: string;
    aiGenerated: boolean;
  }>;
  latestCustomerMessage: string;
  conversationStage: 'initial' | 'ongoing' | 'detailed_inquiry';
  customerSpecifications: string[];
}

export class EnhancedMessageContextLoader {
  async loadFullConversationContext(leadId: string): Promise<ConversationContext | null> {
    try {
      console.log('🔍 [CONTEXT] Loading full conversation context for lead:', leadId);

      // Get lead information
      const { data: lead } = await supabase
        .from('leads')
        .select('first_name, last_name, vehicle_interest')
        .eq('id', leadId)
        .single();

      if (!lead) {
        console.error('❌ [CONTEXT] Lead not found:', leadId);
        return null;
      }

      // Get complete conversation history in chronological order
      const { data: conversations } = await supabase
        .from('conversations')
        .select('body, direction, sent_at, ai_generated')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: true });

      if (!conversations || conversations.length === 0) {
        console.log('📝 [CONTEXT] No conversation history found for lead:', leadId);
        return {
          leadId,
          leadName: `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Customer',
          vehicleInterest: lead.vehicle_interest || '',
          messages: [],
          latestCustomerMessage: '',
          conversationStage: 'initial',
          customerSpecifications: []
        };
      }

      // Process messages and extract context
      const messages = conversations.map(conv => ({
        content: conv.body,
        direction: conv.direction as 'in' | 'out',
        sentAt: conv.sent_at,
        aiGenerated: conv.ai_generated || false
      }));

      // Find the latest customer message (direction = 'in')
      const customerMessages = messages.filter(m => m.direction === 'in');
      const latestCustomerMessage = customerMessages.length > 0 
        ? customerMessages[customerMessages.length - 1].content 
        : '';

      // Determine conversation stage
      const conversationStage = this.determineConversationStage(messages, latestCustomerMessage);

      // Extract customer specifications from their messages
      const customerSpecifications = this.extractCustomerSpecifications(customerMessages.map(m => m.content));

      const context: ConversationContext = {
        leadId,
        leadName: `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Customer',
        vehicleInterest: lead.vehicle_interest || '',
        messages,
        latestCustomerMessage,
        conversationStage,
        customerSpecifications
      };

      console.log('✅ [CONTEXT] Full context loaded:', {
        leadId,
        messageCount: messages.length,
        latestMessage: latestCustomerMessage.substring(0, 50) + '...',
        stage: conversationStage,
        specifications: customerSpecifications
      });

      return context;

    } catch (error) {
      console.error('❌ [CONTEXT] Error loading conversation context:', error);
      return null;
    }
  }

  private determineConversationStage(messages: any[], latestMessage: string): 'initial' | 'ongoing' | 'detailed_inquiry' {
    const customerMessages = messages.filter(m => m.direction === 'in');
    
    if (customerMessages.length === 0) {
      return 'initial';
    }

    // Check if customer is providing detailed specifications
    const detailedKeywords = [
      'diesel', 'ltz', 'technology package', 'ventilated', 'heads up', 'heated',
      '4 wheel drive', 'z71', 'chrome', 'camera', 'surround', 'specific features',
      'looking for', 'want', 'need', 'package', 'trim', 'engine', 'interior'
    ];

    const hasDetailedSpecs = detailedKeywords.some(keyword => 
      latestMessage.toLowerCase().includes(keyword.toLowerCase())
    );

    if (hasDetailedSpecs) {
      return 'detailed_inquiry';
    }

    return customerMessages.length > 1 ? 'ongoing' : 'initial';
  }

  private extractCustomerSpecifications(customerMessages: string[]): string[] {
    const specifications: string[] = [];
    const allText = customerMessages.join(' ').toLowerCase();

    // Extract specific vehicle features mentioned
    const featurePatterns = [
      { pattern: /6\.6l?\s*(?:diesel|duramax)/i, spec: '6.6L Diesel Engine' },
      { pattern: /ltz/i, spec: 'LTZ Trim' },
      { pattern: /technology\s*package/i, spec: 'Technology Package' },
      { pattern: /ventilated\s*(?:front\s*)?seats/i, spec: 'Ventilated Front Seats' },
      { pattern: /heads?\s*up\s*display/i, spec: 'Heads-Up Display' },
      { pattern: /heated\s*(?:rear\s*)?seat/i, spec: 'Heated Rear Seats' },
      { pattern: /4\s*wheel\s*drive/i, spec: '4-Wheel Drive' },
      { pattern: /z71/i, spec: 'Z71 Package' },
      { pattern: /chrome\s*steps/i, spec: 'Chrome Running Boards' },
      { pattern: /surround\s*vision/i, spec: 'Surround Vision Camera' },
      { pattern: /rear\s*view\s*mirror\s*camera/i, spec: 'Rear View Mirror Camera' }
    ];

    featurePatterns.forEach(({ pattern, spec }) => {
      if (pattern.test(allText)) {
        specifications.push(spec);
      }
    });

    return specifications;
  }
}

export const enhancedMessageContextLoader = new EnhancedMessageContextLoader();
