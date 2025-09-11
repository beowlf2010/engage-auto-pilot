
import { supabase } from '@/integrations/supabase/client';
import { enhancedQualityScoring, LeadContext } from './enhancedQualityScoring';
import { conversationSentimentAnalysis, ConversationContext } from './conversationSentimentAnalysis';
import { smartMessageTemplates, TemplateContext } from './smartMessageTemplates';

export interface MessageContext {
  leadId: string;
  leadName: string;
  latestMessage: string;
  conversationHistory: string[];
  vehicleInterest: string;
}

export interface UnifiedAIResponse {
  message: string;
  intent: {
    primary: string;
    confidence: number;
  };
  responseStrategy: string;
  confidence: number;
  reasoning?: string;
}

class UnifiedAIResponseEngine {
  async generateResponse(context: MessageContext): Promise<UnifiedAIResponse | null> {
    try {
      console.log('🤖 [UNIFIED AI] Enhanced response generation for lead:', context.leadId);
      
      // 1. Analyze conversation sentiment for prioritization
      const sentimentContext: ConversationContext = {
        leadId: context.leadId,
        messages: context.conversationHistory.map((msg, index) => ({
          content: msg,
          direction: index % 2 === 0 ? 'in' : 'out',
          timestamp: new Date().toISOString()
        })),
        leadData: { status: 'contacted', daysInFunnel: 1 }
      };
      
      const sentiment = await conversationSentimentAnalysis.analyzeConversationSentiment(sentimentContext);
      
      // 2. Try smart template first for high-urgency situations
      if (sentiment.urgency === 'critical' || sentiment.urgency === 'high') {
        const templateContext: TemplateContext = {
          leadId: context.leadId,
          leadName: context.leadName,
          vehicleInterest: context.vehicleInterest,
          leadStatus: 'contacted',
          sentiment,
          conversationHistory: context.conversationHistory,
          leadData: { daysInFunnel: 1 }
        };
        
        const templateResponse = await smartMessageTemplates.generateMessage(templateContext);
        if (templateResponse && templateResponse.confidence > 0.7) {
          console.log('✅ [UNIFIED AI] Using smart template for urgent lead');
          
          // Validate template response
          const validation = await this.enhancedValidation(templateResponse.content, context);
          if (validation.approved) {
            return {
              message: templateResponse.content,
              intent: { primary: sentiment.intent, confidence: templateResponse.confidence },
              responseStrategy: 'template_optimized',
              confidence: templateResponse.confidence,
              reasoning: `Smart template: ${templateResponse.reasoning}`
            };
          }
        }
      }
      
      // 3. Call the intelligent conversation AI edge function
      const { data, error } = await supabase.functions.invoke('intelligent-conversation-ai', {
        body: {
          leadId: context.leadId,
          leadName: context.leadName,
          messageBody: context.latestMessage,
          latestCustomerMessage: context.latestMessage,
          conversationHistory: context.conversationHistory.join('\n'),
          hasConversationalSignals: context.latestMessage.length > 0,
          leadSource: 'unified_ai',
          leadSourceData: { sentiment, urgency: sentiment.urgency },
          vehicleInterest: context.vehicleInterest
        }
      });

      if (error) {
        console.error('❌ [UNIFIED AI] Edge function error:', error);
        return this.generateFallbackResponse(context);
      }

      if (data?.success && data?.message) {
        console.log('✅ [UNIFIED AI] AI response generated, validating quality...');
        
        // 4. Enhanced validation with quality scoring
        const validation = await this.enhancedValidation(data.message, context);
        if (!validation.approved) {
          console.error('🚫 [UNIFIED AI] Message failed enhanced validation');
          return this.generateFallbackResponse(context);
        }
        
        return {
          message: data.message,
          intent: {
            primary: data.intent || sentiment.intent,
            confidence: validation.score / 100
          },
          responseStrategy: data.strategy || 'ai_optimized',
          confidence: validation.score / 100,
          reasoning: `Enhanced AI response (Quality: ${validation.score})`
        };
      }

      console.log('⚠️ [UNIFIED AI] No valid response from AI, using fallback');
      return this.generateFallbackResponse(context);

    } catch (error) {
      console.error('❌ [UNIFIED AI] Error generating enhanced response:', error);
      return this.generateFallbackResponse(context);
    }
  }

  private async enhancedValidation(message: string, context: MessageContext) {
    const leadContext: LeadContext = {
      leadId: context.leadId,
      leadName: context.leadName,
      vehicleInterest: context.vehicleInterest,
      conversationHistory: context.conversationHistory,
      leadData: {}
    };
    
    return await enhancedQualityScoring.assessMessageQuality(message, leadContext);
  }

  // CRITICAL: Database-level validation using the prevention system
  async validateMessageContent(message: string, leadId?: string): Promise<{ isValid: boolean; failures: string[] }> {
    try {
      console.log('🔍 [VALIDATION] Checking message content:', {
        length: message?.length,
        leadId,
        preview: message?.substring(0, 50)
      });

      // Call the database validation function
      const { data, error } = await supabase.rpc('validate_ai_message_content', {
        p_message_content: message,
        p_lead_id: leadId || null
      });

      if (error) {
        console.error('❌ [VALIDATION] Database validation error:', error);
        // Fail safe - reject on validation error
        return { 
          isValid: false, 
          failures: [`Validation system error: ${error.message}`] 
        };
      }

      console.log('✅ [VALIDATION] Database validation result:', data);
      
      // Type-safe parsing of the JSON response
      const result = data as any;
      return {
        isValid: result?.valid === true,
        failures: Array.isArray(result?.failures) ? result.failures : []
      };
    } catch (error) {
      console.error('❌ [VALIDATION] Validation exception:', error);
      // Fail safe - reject on exception
      return { 
        isValid: false, 
        failures: [`Validation exception: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      };
    }
  }

  validateResponseQuality(message: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (!message || message.trim().length === 0) {
      issues.push('Message is empty');
    }
    
    if (message.length < 10) {
      issues.push('Message is too short');
    }
    
    if (message.length > 500) {
      issues.push('Message is too long');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }

  private generateFallbackResponse(context: MessageContext): UnifiedAIResponse {
    const message = context.latestMessage.toLowerCase();
    
    // Simple fallback based on message content
    if (message.includes('?')) {
      return {
        message: `Hi ${context.leadName}! I'd be happy to help answer your question about ${context.vehicleInterest}. Let me get you the information you need.`,
        intent: { primary: 'asking_question', confidence: 0.6 },
        responseStrategy: 'helpful',
        confidence: 0.6,
        reasoning: 'Fallback response for question'
      };
    }

    if (message.includes('interested') || message.includes('looking')) {
      return {
        message: `Great to hear from you, ${context.leadName}! I'd love to help you with ${context.vehicleInterest}. What specific features are most important to you?`,
        intent: { primary: 'expressing_interest', confidence: 0.6 },
        responseStrategy: 'engagement',
        confidence: 0.6,
        reasoning: 'Fallback response for interest'
      };
    }

    return {
      message: `Hi ${context.leadName}! Thanks for reaching out about ${context.vehicleInterest}. I'm here to help - what would you like to know?`,
      intent: { primary: 'general_inquiry', confidence: 0.5 },
      responseStrategy: 'general',
      confidence: 0.5,
      reasoning: 'General fallback response'
    };
  }
}

export const unifiedAIResponseEngine = new UnifiedAIResponseEngine();
