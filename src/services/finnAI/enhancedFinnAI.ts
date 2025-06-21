import { enhancedContextEngine } from './contextEngine';
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
          'sms_reply',
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
            'sms_reply',
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

  // Generate recommended actions based on insights
  private generateRecommendedActions(contextInsights: any, journeyInsights: any): string[] {
    const actions: string[] = [];

    // Actions based on journey stage
    switch (journeyInsights.stage) {
      case 'awareness':
        actions.push('Send vehicle brochure');
        actions.push('Schedule phone consultation');
        break;
      case 'consideration':
        actions.push('Invite for test drive');
        actions.push('Provide financing options');
        break;
      case 'decision':
        actions.push('Prepare personalized offer');
        actions.push('Address specific concerns');
        break;
    }

    // Actions based on emotional state
    if (contextInsights.emotionalState === 'frustrated') {
      actions.push('Escalate to senior sales representative');
    } else if (contextInsights.emotionalState === 'excited') {
      actions.push('Fast-track appointment scheduling');
    }

    // Actions based on urgency
    if (journeyInsights.urgency === 'high') {
      actions.push('Priority follow-up within 2 hours');
    }

    return actions.slice(0, 3); // Return top 3 actions
  }

  // Get enhanced insights for a lead
  async getEnhancedInsights(leadId: string): Promise<{
    contextInsights: any;
    journeyInsights: any;
    recommendations: string[];
  }> {
    const contextInsights = await enhancedContextEngine.getContextualInsights(leadId);
    const journeyInsights = await customerJourneyTracker.getJourneyInsights(leadId);
    const recommendations = this.generateRecommendedActions(contextInsights, journeyInsights);

    return {
      contextInsights,
      journeyInsights,
      recommendations
    };
  }

  // Track milestone achievement
  async trackMilestone(leadId: string, milestoneType: any, data: any): Promise<void> {
    await customerJourneyTracker.trackMilestone(leadId, milestoneType, data);
  }

  // Track custom touchpoint
  async trackTouchpoint(leadId: string, type: any, channel: any, data: any, outcome?: any): Promise<void> {
    await customerJourneyTracker.trackTouchpoint(leadId, type, channel, data, outcome);
  }
}

export const enhancedFinnAI = new EnhancedFinnAI();
