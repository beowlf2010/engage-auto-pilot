
import { enhancedContextEngine } from './context/contextEngine';
import { customerJourneyTracker } from './customerJourneyTracker';
import { generateEnhancedIntelligentResponse } from '../intelligentConversationAI';

export interface EnhancedAIRequest {
  leadId: string;
  message: string;
  direction: 'in' | 'out';
  context?: any;
}

export interface EnhancedAIResponse {
  message: string;
  confidence: number;
  reasoning: string;
  contextInsights: any;
  journeyInsights: any;
  recommendedActions: string[];
}

class EnhancedFinnAI {
  // Process message with enhanced context and journey tracking
  async processMessage(request: EnhancedAIRequest): Promise<EnhancedAIResponse | null> {
    try {
      const { leadId, message, direction } = request;

      // Process message through context engine
      await enhancedContextEngine.processMessage(leadId, message, direction);

      // Track touchpoint in journey
      if (direction === 'in') {
        await customerJourneyTracker.trackTouchpoint(
          leadId,
          'customer_message',
          'sms',
          { content: message, messageLength: message.length },
          this.detectMessageSentiment(message)
        );
      }

      // Get contextual insights
      const contextInsights = await enhancedContextEngine.getContextualInsights(leadId);
      const journeyInsights = await customerJourneyTracker.getJourneyInsights(leadId);

      // Generate AI response if it's an incoming message
      if (direction === 'in') {
        // Create enhanced context for AI
        const enhancedContext = {
          leadId,
          leadName: request.context?.leadName || '',
          vehicleInterest: request.context?.vehicleInterest || '',
          messages: request.context?.messages || [],
          leadInfo: request.context?.leadInfo,
          contextInsights,
          journeyInsights
        };

        const aiResponse = await generateEnhancedIntelligentResponse(enhancedContext);

        if (aiResponse) {
          // Track AI response touchpoint
          await customerJourneyTracker.trackTouchpoint(
            leadId,
            'agent_message',
            'sms',
            { content: aiResponse.message, aiGenerated: true },
            'positive'
          );

          return {
            message: aiResponse.message,
            confidence: aiResponse.confidence,
            reasoning: `Enhanced AI with context: ${contextInsights.communicationStyle} style, ${contextInsights.emotionalState} mood, ${journeyInsights.stage} stage`,
            contextInsights,
            journeyInsights,
            recommendedActions: this.generateRecommendedActions(contextInsights, journeyInsights)
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error processing enhanced AI message:', error);
      return null;
    }
  }

  // Detect message sentiment
  private detectMessageSentiment(message: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['great', 'love', 'excellent', 'perfect', 'amazing', 'interested', 'yes', 'good'];
    const negativeWords = ['bad', 'hate', 'terrible', 'awful', 'no', 'not interested', 'cancel', 'stop'];
    
    const words = message.toLowerCase().split(' ');
    const positiveCount = words.filter(w => positiveWords.includes(w)).length;
    const negativeCount = words.filter(w => negativeWords.includes(w)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  // Generate recommended actions
  private generateRecommendedActions(contextInsights: any, journeyInsights: any): string[] {
    const actions: string[] = [];
    
    if (contextInsights?.emotionalState === 'frustrated') {
      actions.push('Address customer concerns with empathy');
    }
    
    if (journeyInsights?.stage === 'decision') {
      actions.push('Present clear next steps and pricing');
    }
    
    if (contextInsights?.communicationStyle === 'formal') {
      actions.push('Maintain professional tone in responses');
    }
    
    return actions;
  }
}

export const enhancedFinnAI = new EnhancedFinnAI();
