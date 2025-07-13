import { supabase } from '@/integrations/supabase/client';
import { consolidatedSendMessage } from './consolidatedMessagesService';

interface ConversationAdvancementConfig {
  leadId: string;
  conversationStage: 'finance_inquiry' | 'pricing_discussion' | 'feature_interest' | 'stalled';
  lastMessageDirection: 'in' | 'out';
  timeSinceLastMessage: number; // hours
  context?: {
    vehicleInterest?: string;
    rateQuoted?: string;
    zipCode?: string;
    trimLevel?: string;
  };
}

interface AdvancementStrategy {
  messageContent: string;
  urgencyLevel: 'low' | 'medium' | 'high';
  scheduledDelay?: number; // hours
  followUpSequence?: string[];
}

export class ConversationAdvancementService {
  
  // Hot finance lead templates - for leads already engaged with financing
  private getFinanceAdvancementStrategy(config: ConversationAdvancementConfig): AdvancementStrategy {
    const { context, timeSinceLastMessage } = config;
    
    if (timeSinceLastMessage < 2) {
      // Immediate follow-up - create urgency around rate
      return {
        messageContent: `${context?.rateQuoted ? `That ${context.rateQuoted} rate` : 'This rate'} is only available through this month - it's actually one of our best rates right now! I'd love to get this locked in for you. Are you available for a quick call today to discuss the ${context?.trimLevel || 'trim'} details and get the paperwork started? This rate could save you hundreds compared to waiting.`,
        urgencyLevel: 'high',
        followUpSequence: [
          'Just wanted to follow up on that great rate we discussed. Still interested in moving forward?',
          'I wanted to make sure you didn\'t miss out on that special financing. The month is almost over - should we schedule a time to meet?'
        ]
      };
    } else if (timeSinceLastMessage < 24) {
      // Same day follow-up - add value with features
      return {
        messageContent: `Hi! I was thinking about your interest in the ${context?.vehicleInterest || 'Silverado 3500HD'}. The ${context?.trimLevel || 'LTZ'} comes with some incredible features that make it worth every penny at that ${context?.rateQuoted || '5.9%'} rate. Would you like me to send over the full spec sheet, or would you prefer to see it in person?`,
        urgencyLevel: 'medium',
        scheduledDelay: 4
      };
    } else {
      // Final urgency push
      return {
        messageContent: `Marcus, I don't want you to miss out on this opportunity. That ${context?.rateQuoted || 'special rate'} expires soon, and inventory on the ${context?.vehicleInterest || 'vehicle you\'re interested in'} is moving fast. Can we at least schedule a quick 15-minute call to discuss your options?`,
        urgencyLevel: 'high'
      };
    }
  }

  // Main advancement logic
  async advanceConversation(leadId: string): Promise<{ success: boolean; message?: string; strategy?: AdvancementStrategy }> {
    try {
      // Get lead and conversation context
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (leadError || !leadData) {
        throw new Error('Lead not found');
      }

      // Get recent conversations
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: false })
        .limit(5);

      if (convError) {
        throw new Error('Failed to fetch conversations');
      }

      if (!conversations || conversations.length === 0) {
        return { success: false, message: 'No conversation history found' };
      }

      const lastMessage = conversations[0];
      const timeSinceLastMessage = Math.floor((Date.now() - new Date(lastMessage.sent_at).getTime()) / (1000 * 60 * 60));

      // Analyze conversation for advancement strategy
      const config: ConversationAdvancementConfig = {
        leadId,
        conversationStage: this.detectConversationStage(conversations),
        lastMessageDirection: lastMessage.direction as 'in' | 'out',
        timeSinceLastMessage,
        context: {
          vehicleInterest: leadData.vehicle_interest,
          // Extract context from conversation if available
          rateQuoted: this.extractRateFromConversations(conversations),
          zipCode: this.extractZipFromConversations(conversations),
          trimLevel: this.extractTrimFromConversations(conversations)
        }
      };

      let strategy: AdvancementStrategy;

      // Determine strategy based on conversation stage
      switch (config.conversationStage) {
        case 'finance_inquiry':
          strategy = this.getFinanceAdvancementStrategy(config);
          break;
        case 'pricing_discussion':
          strategy = this.getPricingAdvancementStrategy(config);
          break;
        case 'feature_interest':
          strategy = this.getFeatureAdvancementStrategy(config);
          break;
        default:
          strategy = this.getGenericAdvancementStrategy(config);
      }

      return { success: true, strategy };

    } catch (error) {
      console.error('❌ [CONVERSATION ADVANCEMENT] Error:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Detect what stage the conversation is in
  private detectConversationStage(conversations: any[]): ConversationAdvancementConfig['conversationStage'] {
    const recentMessages = conversations.slice(0, 3);
    const messageText = recentMessages.map(m => m.body.toLowerCase()).join(' ');

    // Enhanced detection for finance inquiries including basic responses
    if (messageText.includes('rate') || messageText.includes('interest') || messageText.includes('financing') || 
        messageText.includes('months') || messageText.includes('payment') || messageText.includes('finance') ||
        messageText.includes('thx') || messageText.includes('thanks') || messageText.includes('thank')) {
      return 'finance_inquiry';
    } else if (messageText.includes('price') || messageText.includes('cost')) {
      return 'pricing_discussion';
    } else if (messageText.includes('feature') || messageText.includes('trim') || messageText.includes('ltz') || messageText.includes('silverado')) {
      return 'feature_interest';
    }

    return 'stalled';
  }

  // Extract rate information from conversations
  private extractRateFromConversations(conversations: any[]): string | undefined {
    for (const conv of conversations) {
      const match = conv.body.match(/(\d+\.?\d*)\s*%?\s*for\s*\d+\s*months?/i);
      if (match) {
        return `${match[1]}%`;
      }
    }
    return undefined;
  }

  // Extract zip code from conversations
  private extractZipFromConversations(conversations: any[]): string | undefined {
    for (const conv of conversations) {
      const match = conv.body.match(/\b\d{5}\b/);
      if (match) {
        return match[0];
      }
    }
    return undefined;
  }

  // Extract trim level from conversations
  private extractTrimFromConversations(conversations: any[]): string | undefined {
    const trimLevels = ['ltz', 'lt', 'work truck', 'high country', 'rst'];
    for (const conv of conversations) {
      for (const trim of trimLevels) {
        if (conv.body.toLowerCase().includes(trim)) {
          return trim.toUpperCase();
        }
      }
    }
    return undefined;
  }

  // Other advancement strategies
  private getPricingAdvancementStrategy(config: ConversationAdvancementConfig): AdvancementStrategy {
    return {
      messageContent: `I understand pricing is important. Let me get you our best numbers on the ${config.context?.vehicleInterest || 'vehicle you\'re interested in'}. When would be a good time for a quick call to go over everything?`,
      urgencyLevel: 'medium'
    };
  }

  private getFeatureAdvancementStrategy(config: ConversationAdvancementConfig): AdvancementStrategy {
    return {
      messageContent: `The ${config.context?.trimLevel || 'trim level'} has some amazing features that are really hard to appreciate until you see them in person. Would you like to schedule a time to take a look?`,
      urgencyLevel: 'low'
    };
  }

  private getGenericAdvancementStrategy(config: ConversationAdvancementConfig): AdvancementStrategy {
    return {
      messageContent: `Just wanted to check in and see if you had any other questions about the ${config.context?.vehicleInterest || 'vehicle'}. I'm here to help!`,
      urgencyLevel: 'low'
    };
  }

  // Send advancement message using compliant service
  async sendAdvancementMessage(leadId: string, strategy: AdvancementStrategy): Promise<{ success: boolean; messageId?: string }> {
    try {
      console.log(`🚀 [CONVERSATION ADVANCEMENT] Sending AI advancement message to lead: ${leadId}`);
      console.log(`📝 [CONVERSATION ADVANCEMENT] Message: "${strategy.messageContent}"`);
      
      // Use the consolidated message service with full compliance checks
      const result = await consolidatedSendMessage({
        leadId,
        messageBody: strategy.messageContent,
        profileId: 'ai-system', // Use a special AI system profile ID
        isAIGenerated: true
      });

      if (result.success) {
        console.log(`✅ [CONVERSATION ADVANCEMENT] Message sent successfully via compliant service`);
        return { 
          success: true, 
          messageId: result.conversationId 
        };
      } else {
        console.error(`❌ [CONVERSATION ADVANCEMENT] Message failed via compliant service:`, result.error);
        return { 
          success: false 
        };
      }
    } catch (error) {
      console.error('❌ [CONVERSATION ADVANCEMENT] Error sending advancement message:', error);
      return { success: false };
    }
  }
}

export const conversationAdvancementService = new ConversationAdvancementService();
