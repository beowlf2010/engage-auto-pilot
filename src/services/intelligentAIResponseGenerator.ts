
import { supabase } from '@/integrations/supabase/client';
import { ConversationContext } from './enhancedMessageContextLoader';

export interface IntelligentAIResponse {
  message: string;
  confidence: number;
  responseType: 'greeting' | 'specification_response' | 'follow_up' | 'inventory_match';
  reasoning: string;
}

export class IntelligentAIResponseGenerator {
  async generateContextualResponse(context: ConversationContext): Promise<IntelligentAIResponse | null> {
    try {
      console.log('🤖 [INTELLIGENT AI] Generating contextual response for stage:', context.conversationStage);

      // Get dealership context
      const dealershipContext = await this.getDealershipContext();
      
      // Generate appropriate response based on conversation stage and context
      const response = await this.callIntelligentAI(context, dealershipContext);

      if (!response) {
        console.error('❌ [INTELLIGENT AI] Failed to generate response');
        return null;
      }

      console.log('✅ [INTELLIGENT AI] Generated intelligent response:', {
        type: response.responseType,
        confidence: response.confidence,
        preview: response.message.substring(0, 100) + '...'
      });

      return response;

    } catch (error) {
      console.error('❌ [INTELLIGENT AI] Error generating response:', error);
      return null;
    }
  }

  private async getDealershipContext() {
    const { data } = await supabase.functions.invoke('get-dealership-context');
    return data || {
      dealershipName: 'Jason Pilger Chevrolet',
      salespersonName: 'Finn',
      location: 'Atmore, AL'
    };
  }

  private async callIntelligentAI(context: ConversationContext, dealershipContext: any): Promise<IntelligentAIResponse | null> {
    try {
      // Build intelligent system prompt based on conversation stage
      const systemPrompt = this.buildIntelligentSystemPrompt(context, dealershipContext);
      
      // Build user prompt with full context
      const userPrompt = this.buildContextualUserPrompt(context);

      console.log('📝 [INTELLIGENT AI] System prompt length:', systemPrompt.length);
      console.log('📝 [INTELLIGENT AI] User prompt preview:', userPrompt.substring(0, 200) + '...');

      const { data, error } = await supabase.functions.invoke('intelligent-conversation-ai', {
        body: {
          leadId: context.leadId,
          leadName: context.leadName,
          messageBody: context.latestCustomerMessage,
          latestCustomerMessage: context.latestCustomerMessage,
          conversationHistory: context.messages.map(m => m.content).join('\n'),
          hasConversationalSignals: context.latestCustomerMessage.length > 0,
          leadSource: 'intelligent_context',
          leadSourceData: {
            conversationStage: context.conversationStage,
            customerSpecifications: context.customerSpecifications,
            messageCount: context.messages.length
          },
          vehicleInterest: context.vehicleInterest,
          systemPrompt,
          userPrompt
        }
      });

      if (error) {
        console.error('❌ [INTELLIGENT AI] Edge function error:', error);
        return null;
      }

      if (data?.success && data?.message) {
        return {
          message: data.message,
          confidence: data.confidence || 0.8,
          responseType: this.determineResponseType(context, data.message),
          reasoning: `Intelligent response for ${context.conversationStage} stage conversation with ${context.customerSpecifications.length} specifications`
        };
      }

      return null;

    } catch (error) {
      console.error('❌ [INTELLIGENT AI] Error calling AI:', error);
      return null;
    }
  }

  private buildIntelligentSystemPrompt(context: ConversationContext, dealershipContext: any): string {
    const basePrompt = `You are ${dealershipContext.salespersonName} from ${dealershipContext.dealershipName} in ${dealershipContext.location}. You are an expert automotive sales representative with deep knowledge of vehicle features, specifications, and inventory.

CRITICAL INSTRUCTIONS:
- NEVER start with generic greetings like "Hi there!" if this is an ongoing conversation
- ALWAYS respond directly to the customer's most recent message and specifications
- If the customer mentions specific features, acknowledge them specifically and provide relevant information
- Be knowledgeable, helpful, and professional
- Focus on the customer's actual needs and specifications`;

    // Customize prompt based on conversation stage
    switch (context.conversationStage) {
      case 'initial':
        return basePrompt + `\n\nThis is the beginning of the conversation. Provide a warm, professional greeting and ask how you can help.`;
      
      case 'detailed_inquiry':
        return basePrompt + `\n\nThe customer has provided specific vehicle specifications: ${context.customerSpecifications.join(', ')}. 
        RESPOND DIRECTLY to these specifications. Acknowledge what they're looking for, provide relevant information about those features, 
        and offer to check availability or provide more details about those specific features.`;
      
      case 'ongoing':
        return basePrompt + `\n\nThis is an ongoing conversation. Continue the conversation naturally based on the customer's latest message. 
        Don't restart with greetings - respond to what they just said.`;
      
      default:
        return basePrompt;
    }
  }

  private buildContextualUserPrompt(context: ConversationContext): string {
    let prompt = `Customer: ${context.leadName}\nVehicle Interest: ${context.vehicleInterest}\n\n`;

    if (context.messages.length > 0) {
      prompt += `Recent Conversation:\n`;
      // Show last 5 messages for context
      const recentMessages = context.messages.slice(-5);
      recentMessages.forEach(msg => {
        const sender = msg.direction === 'in' ? context.leadName : 'You';
        prompt += `${sender}: ${msg.content}\n`;
      });
    }

    if (context.customerSpecifications.length > 0) {
      prompt += `\nCustomer's Specific Requirements:\n${context.customerSpecifications.map(spec => `- ${spec}`).join('\n')}\n`;
    }

    prompt += `\nLatest Customer Message: "${context.latestCustomerMessage}"\n\n`;
    prompt += `Provide a helpful, contextual response that directly addresses their latest message and specifications.`;

    return prompt;
  }

  private determineResponseType(context: ConversationContext, message: string): 'greeting' | 'specification_response' | 'follow_up' | 'inventory_match' {
    if (context.conversationStage === 'initial') {
      return 'greeting';
    }
    
    if (context.customerSpecifications.length > 0) {
      return 'specification_response';
    }

    if (message.toLowerCase().includes('inventory') || message.toLowerCase().includes('available')) {
      return 'inventory_match';
    }

    return 'follow_up';
  }
}

export const intelligentAIResponseGenerator = new IntelligentAIResponseGenerator();
