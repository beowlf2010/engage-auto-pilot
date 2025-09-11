
import { supabase } from '@/integrations/supabase/client';
import { enhancedQualityScoring, LeadContext } from './enhancedQualityScoring';
import { conversationSentimentAnalysis, ConversationContext } from './conversationSentimentAnalysis';
import { smartMessageTemplates, TemplateContext } from './smartMessageTemplates';
import { leadSourceStrategy } from './leadSourceStrategy';
import type { LeadSourceData, SourceConversationStrategy } from '@/types/leadSource';

export interface MessageContext {
  leadId: string;
  leadName: string;
  latestMessage: string;
  conversationHistory: string[];
  vehicleInterest: string;
  leadSource?: string;
  leadSourceData?: LeadSourceData;
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
      
      // 0. Get lead source context for tailored approach
      const sourceData = await this.getLeadSourceContext(context);
      const sourceStrategy = this.getSourceConversationStrategy(sourceData);
      
      console.log('📊 [UNIFIED AI] Lead source strategy:', {
        source: sourceData.source,
        category: sourceData.sourceCategory,
        urgency: sourceData.urgencyLevel,
        style: sourceData.communicationStyle,
        probability: sourceData.conversionProbability
      });
      
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
      
      // 3. Call the intelligent conversation AI edge function with source context
      const { data, error } = await supabase.functions.invoke('intelligent-conversation-ai', {
        body: {
          leadId: context.leadId,
          leadName: context.leadName,
          messageBody: context.latestMessage,
          latestCustomerMessage: context.latestMessage,
          conversationHistory: context.conversationHistory.join('\n'),
          hasConversationalSignals: context.latestMessage.length > 0,
          leadSource: sourceData.source,
          leadSourceData: { 
            ...sourceData,
            sentiment, 
            urgency: sentiment.urgency,
            conversationStrategy: sourceStrategy
          },
          vehicleInterest: context.vehicleInterest,
          sourceStrategy: sourceStrategy
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

  private async getLeadSourceContext(context: MessageContext): Promise<LeadSourceData> {
    // Use provided source data if available
    if (context.leadSourceData) {
      return context.leadSourceData;
    }

    // Fetch lead source from database if needed
    if (context.leadSource) {
      return leadSourceStrategy.getLeadSourceData(context.leadSource);
    }

    try {
      const { data: lead } = await supabase
        .from('leads')
        .select('source')
        .eq('id', context.leadId)
        .single();

      if (lead?.source) {
        return leadSourceStrategy.getLeadSourceData(lead.source);
      }
    } catch (error) {
      console.warn('⚠️ [UNIFIED AI] Could not fetch lead source:', error);
    }

    // Fallback to unknown source
    return leadSourceStrategy.getLeadSourceData('unknown');
  }

  private getSourceConversationStrategy(sourceData: LeadSourceData): SourceConversationStrategy {
    const strategies: Record<string, SourceConversationStrategy> = {
      high_intent_digital: {
        category: 'high_intent_digital',
        initialTone: 'professional and confident',
        keyFocusAreas: ['specific vehicle details', 'pricing and financing', 'immediate next steps'],
        avoidanceTopics: ['lengthy introductions', 'general dealership info'],
        responseTemplates: {
          greeting: `Hi ${sourceData.source === 'AutoTrader' ? 'there' : 'valued customer'}! I see you're interested in our vehicles. Let me help you find exactly what you're looking for.`,
          pricing: 'I have competitive pricing information ready for you. Let me share the details and available incentives.',
          availability: 'This vehicle is available for immediate viewing. Would you like to schedule a visit today?',
          followUp: 'Based on your high interest, I want to ensure we move quickly to secure your ideal vehicle.'
        },
        conversationGoals: ['qualify quickly', 'schedule appointment', 'discuss financing'],
        urgencyHandling: 'immediate'
      },
      value_focused: {
        category: 'value_focused',
        initialTone: 'friendly and consultative',
        keyFocusAreas: ['value proposition', 'cost comparisons', 'total ownership benefits'],
        avoidanceTopics: ['high-pressure tactics', 'premium features they didnt ask for'],
        responseTemplates: {
          greeting: 'Thanks for your interest! I understand value is important to you. Let me show you the best options within your range.',
          pricing: 'Let me break down the total value, including warranties, maintenance, and financing options.',
          availability: 'I have several great value options available. Would you like to compare a few?',
          followUp: 'I want to make sure you get the best deal possible. Have you had a chance to review the information?'
        },
        conversationGoals: ['build trust', 'demonstrate value', 'compare options'],
        urgencyHandling: 'same_day'
      },
      credit_ready: {
        category: 'credit_ready',
        initialTone: 'professional and supportive',
        keyFocusAreas: ['financing approval', 'payment options', 'credit advantages'],
        avoidanceTopics: ['credit concerns', 'lengthy approval processes'],
        responseTemplates: {
          greeting: 'Great news about your financing! Let me help you find the perfect vehicle with your approved terms.',
          pricing: 'With your financing in place, we can focus on finding the right vehicle within your approved amount.',
          availability: 'Since financing is ready, we can move quickly. Would you like to see this vehicle today?',
          followUp: 'Your financing approval has a timeline - let me help you secure your vehicle promptly.'
        },
        conversationGoals: ['leverage pre-approval', 'expedite selection', 'close quickly'],
        urgencyHandling: 'immediate'
      },
      social_discovery: {
        category: 'social_discovery',
        initialTone: 'casual and engaging',
        keyFocusAreas: ['lifestyle fit', 'social proof', 'easy exploration'],
        avoidanceTopics: ['aggressive sales tactics', 'complex technical details'],
        responseTemplates: {
          greeting: 'Hey! Thanks for checking us out on social media. What caught your eye about this vehicle?',
          pricing: 'Let me share some pricing that fits different lifestyles. What works best for you?',
          availability: 'Want to take a look in person? No pressure - just come check it out when convenient.',
          followUp: 'Hope you found our info helpful! Any questions as you explore your options?'
        },
        conversationGoals: ['build relationship', 'educate gently', 'remove barriers'],
        urgencyHandling: 'flexible'
      },
      referral_based: {
        category: 'referral_based',
        initialTone: 'warm and appreciative',
        keyFocusAreas: ['referrer connection', 'family/friend discount', 'trust building'],
        avoidanceTopics: ['cold sales pitches', 'ignoring referral source'],
        responseTemplates: {
          greeting: 'Thanks for the referral! It means so much when satisfied customers recommend us to friends and family.',
          pricing: 'As a referral, you qualify for our family pricing. Let me share those exclusive rates.',
          availability: 'Your referrer had a great experience with us, and I want to ensure yours is even better!',
          followUp: 'I want to make sure you have the same great experience that prompted your referral.'
        },
        conversationGoals: ['honor referral', 'exceed expectations', 'create advocate'],
        urgencyHandling: 'next_day'
      },
      service_related: {
        category: 'service_related',
        initialTone: 'helpful and relationship-focused',
        keyFocusAreas: ['current relationship value', 'loyalty benefits', 'trade considerations'],
        avoidanceTopics: ['ignoring service history', 'treating as cold lead'],
        responseTemplates: {
          greeting: 'Great to hear from a valued service customer! How can I help with your vehicle needs?',
          pricing: 'As a loyal customer, you have access to special pricing and trade advantages.',
          availability: 'Since you know our service quality, let me show you our sales excellence too.',
          followUp: 'Your continued trust in our service means everything. Let me earn your sales business too.'
        },
        conversationGoals: ['leverage relationship', 'convert service to sales', 'maximize loyalty'],
        urgencyHandling: 'flexible'
      }
    };

    return strategies[sourceData.sourceCategory] || strategies['value_focused'];
  }
}

export const unifiedAIResponseEngine = new UnifiedAIResponseEngine();
