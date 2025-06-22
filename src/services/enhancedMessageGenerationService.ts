
import { contextualAIAssistant } from './contextualAIAssistant';
import { enhancedFinnAI } from './finnAI/enhancedFinnAI';
import { generateEnhancedIntelligentResponse } from './intelligentConversationAI';
import { supabase } from '@/integrations/supabase/client';

export interface EnhancedMessageRequest {
  leadId: string;
  conversationHistory: string;
  latestMessage?: string;
  messageType: 'follow_up' | 'response' | 'nurture' | 'closing';
  urgencyLevel?: 'critical' | 'high' | 'medium' | 'low';
  customContext?: any;
}

export interface EnhancedMessageResponse {
  message: string;
  confidence: number;
  reasoning: string;
  aiInsights: any;
  suggestedActions: string[];
  messageMetadata: {
    tone: string;
    length: number;
    expectedResponseTime: string;
    followUpRequired: boolean;
  };
}

class EnhancedMessageGenerationService {
  async generateContextualMessage(request: EnhancedMessageRequest): Promise<EnhancedMessageResponse | null> {
    try {
      console.log('🚀 Generating enhanced contextual message for lead:', request.leadId);

      // Get AI insights first
      let aiInsights = null;
      if (request.latestMessage) {
        aiInsights = await contextualAIAssistant.analyzeConversationContext(
          request.leadId,
          request.conversationHistory,
          request.latestMessage
        );
      }

      // Process through enhanced FinnAI
      const finnAIResponse = await enhancedFinnAI.processMessage({
        leadId: request.leadId,
        message: request.latestMessage || 'Generate follow-up message',
        direction: 'in',
        context: {
          conversationHistory: request.conversationHistory,
          messageType: request.messageType,
          urgencyLevel: request.urgencyLevel,
          customContext: request.customContext
        }
      });

      // Generate base message using intelligent conversation AI
      const baseMessage = await this.generateBaseMessage(request, aiInsights);

      // Enhance message based on contextual insights
      const enhancedMessage = this.enhanceMessageWithContext(baseMessage, aiInsights, finnAIResponse);

      // Determine message metadata
      const messageMetadata = this.generateMessageMetadata(enhancedMessage, aiInsights);

      // Generate suggested actions
      const suggestedActions = this.generateSuggestedActions(aiInsights, request.messageType);

      return {
        message: enhancedMessage,
        confidence: finnAIResponse?.confidence || 0.7,
        reasoning: this.generateReasoning(aiInsights, finnAIResponse),
        aiInsights,
        suggestedActions,
        messageMetadata
      };

    } catch (error) {
      console.error('❌ Error generating enhanced contextual message:', error);
      return null;
    }
  }

  private async generateBaseMessage(request: EnhancedMessageRequest, aiInsights: any): Promise<string> {
    // Get lead information
    const { data: lead } = await supabase
      .from('leads')
      .select('first_name, vehicle_interest')
      .eq('id', request.leadId)
      .single();

    if (!lead) {
      throw new Error('Lead not found');
    }

    // Create context for AI generation
    const context = {
      leadId: request.leadId,
      leadName: lead.first_name,
      vehicleInterest: lead.vehicle_interest,
      messages: this.parseConversationHistory(request.conversationHistory),
      leadInfo: {
        phone: '',
        status: 'active',
        lastReplyAt: new Date().toISOString()
      }
    };

    // Generate intelligent response
    const response = await generateEnhancedIntelligentResponse(context);
    return response?.message || this.generateFallbackMessage(lead.first_name, request.messageType);
  }

  private enhanceMessageWithContext(baseMessage: string, aiInsights: any, finnAIResponse: any): string {
    if (!aiInsights) return baseMessage;

    let enhancedMessage = baseMessage;

    // Adjust tone based on emotional state
    if (aiInsights.conversationStage === 'decision') {
      enhancedMessage = this.addUrgencyToMessage(enhancedMessage);
    }

    // Add personalization based on context
    if (finnAIResponse?.contextInsights?.communicationStyle === 'formal') {
      enhancedMessage = this.makeMeessageMoreFormal(enhancedMessage);
    } else if (finnAIResponse?.contextInsights?.communicationStyle === 'casual') {
      enhancedMessage = this.makeMessageMoreCasual(enhancedMessage);
    }

    // Add empathy if customer is frustrated
    if (finnAIResponse?.contextInsights?.emotionalState === 'frustrated') {
      enhancedMessage = this.addEmpathyToMessage(enhancedMessage);
    }

    return enhancedMessage;
  }

  private generateMessageMetadata(message: string, aiInsights: any) {
    return {
      tone: this.determineTone(message, aiInsights),
      length: message.length,
      expectedResponseTime: this.predictResponseTime(aiInsights),
      followUpRequired: this.shouldScheduleFollowUp(aiInsights)
    };
  }

  private generateSuggestedActions(aiInsights: any, messageType: string): string[] {
    const actions: string[] = [];

    if (aiInsights?.nextBestActions) {
      actions.push(...aiInsights.nextBestActions.slice(0, 3).map((action: any) => action.action));
    }

    // Add message-type specific actions
    switch (messageType) {
      case 'follow_up':
        actions.push('Schedule next touchpoint');
        break;
      case 'response':
        actions.push('Monitor for customer reply');
        break;
      case 'nurture':
        actions.push('Track engagement metrics');
        break;
      case 'closing':
        actions.push('Prepare offer documents');
        break;
    }

    return actions;
  }

  private generateReasoning(aiInsights: any, finnAIResponse: any): string {
    const reasons: string[] = [];

    if (aiInsights) {
      reasons.push(`Lead temperature: ${aiInsights.leadTemperature}%`);
      reasons.push(`Conversation stage: ${aiInsights.conversationStage}`);
      reasons.push(`Urgency level: ${aiInsights.urgencyLevel}`);
    }

    if (finnAIResponse?.reasoning) {
      reasons.push(finnAIResponse.reasoning);
    }

    return reasons.join(' | ');
  }

  // Helper methods for message enhancement
  private addUrgencyToMessage(message: string): string {
    if (message.includes('?')) {
      return message.replace('?', '? Time is important here, so let me know soon!');
    }
    return message + ' Let me know as soon as you can!';
  }

  private makeMeessageMoreFormal(message: string): string {
    return message
      .replace(/Hi /g, 'Hello ')
      .replace(/Let's /g, 'Let us ')
      .replace(/can't/g, 'cannot')
      .replace(/won't/g, 'will not');
  }

  private makeMessageMoreCasual(message: string): string {
    return message
      .replace(/Hello /g, 'Hi ')
      .replace(/cannot/g, "can't")
      .replace(/will not/g, "won't");
  }

  private addEmpathyToMessage(message: string): string {
    return `I understand this might be frustrating. ${message}`;
  }

  private determineTone(message: string, aiInsights: any): string {
    if (message.includes('understand') || message.includes('sorry')) {
      return 'empathetic';
    }
    if (message.includes('!') && !message.includes('?')) {
      return 'enthusiastic';
    }
    if (aiInsights?.urgencyLevel === 'critical') {
      return 'urgent';
    }
    return 'professional';
  }

  private predictResponseTime(aiInsights: any): string {
    if (aiInsights?.urgencyLevel === 'critical') {
      return 'within 1 hour';
    }
    if (aiInsights?.leadTemperature > 70) {
      return 'within 4 hours';
    }
    return 'within 24 hours';
  }

  private shouldScheduleFollowUp(aiInsights: any): boolean {
    return aiInsights?.followUpScheduling?.shouldSchedule || false;
  }

  private parseConversationHistory(history: string): any[] {
    // Simple parser - in production would be more sophisticated
    return history.split('\n').map((line, index) => ({
      id: index,
      body: line,
      direction: line.startsWith('Customer:') ? 'in' : 'out',
      sentAt: new Date().toISOString(),
      aiGenerated: false
    }));
  }

  private generateFallbackMessage(firstName: string, messageType: string): string {
    const fallbacks = {
      follow_up: `Hi ${firstName}! I wanted to follow up on our conversation. Do you have any questions I can help with?`,
      response: `Hi ${firstName}! Thanks for your message. I'm here to help you find the perfect vehicle.`,
      nurture: `Hi ${firstName}! I hope you're having a great day. I wanted to share some information that might interest you.`,
      closing: `Hi ${firstName}! I think we've found the perfect match for you. Are you ready to move forward?`
    };
    
    return fallbacks[messageType] || fallbacks.follow_up;
  }
}

export const enhancedMessageGenerationService = new EnhancedMessageGenerationService();
