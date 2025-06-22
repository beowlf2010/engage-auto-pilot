
import { supabase } from '@/integrations/supabase/client';
import { realtimeLearningService } from './realtimeLearningService';

export interface UnknownMessagePattern {
  id: string;
  messageContent: string;
  messageContext: any;
  failureReason: string;
  leadId: string;
  timestamp: Date;
  humanResponse?: string;
  resolved: boolean;
  confidence: number;
}

export interface MessagePattern {
  keywords: string[];
  intent: string;
  confidence: number;
  successfulResponses: string[];
}

class UnknownMessageLearningService {
  private patterns: Map<string, MessagePattern> = new Map();

  // Capture when AI fails to generate a response
  async captureUnknownMessage(
    leadId: string,
    messageContent: string,
    context: any,
    failureReason: string
  ): Promise<void> {
    try {
      console.log('📚 [UNKNOWN LEARNING] Capturing unknown message:', messageContent);

      // Record the unknown message learning outcome
      await supabase.from('ai_learning_outcomes').insert({
        lead_id: leadId,
        outcome_type: 'response_received',
        message_characteristics: {
          message_content: messageContent,
          message_length: messageContent.length,
          failure_reason: failureReason,
          context: context,
          unknown_scenario: true
        },
        lead_characteristics: {
          unknown_scenario: true,
          requires_human_intervention: true
        },
        seasonal_context: {
          hour: new Date().getHours(),
          day_of_week: new Date().getDay(),
          month: new Date().getMonth()
        }
      });

      // Trigger real-time learning event using valid event type
      await realtimeLearningService.processLearningEvent({
        type: 'response_received',
        leadId,
        data: {
          messageContent,
          failureReason,
          context,
          unknownScenario: true
        },
        timestamp: new Date()
      });

      console.log('✅ [UNKNOWN LEARNING] Captured unknown message scenario');

    } catch (error) {
      console.error('❌ [UNKNOWN LEARNING] Error capturing unknown message:', error);
    }
  }

  // Capture human response to unknown message as training data
  async captureHumanResponse(
    leadId: string,
    originalMessage: string,
    humanResponse: string,
    messageId: string
  ): Promise<void> {
    try {
      console.log('👤 [UNKNOWN LEARNING] Capturing human response for training');

      // Record as positive learning outcome
      await supabase.from('ai_learning_outcomes').insert({
        lead_id: leadId,
        outcome_type: 'message_sent',
        message_characteristics: {
          original_unknown_message: originalMessage,
          human_response: humanResponse,
          response_length: humanResponse.length
        },
        lead_characteristics: {
          learned_from_human: true,
          training_data: true
        },
        seasonal_context: {
          hour: new Date().getHours(),
          day_of_week: new Date().getDay(),
          month: new Date().getMonth()
        }
      });

      // Store as message feedback for AI improvement
      await supabase.from('ai_message_feedback').insert({
        lead_id: leadId,
        conversation_id: messageId,
        message_content: originalMessage,
        feedback_type: 'positive',
        human_response_provided: humanResponse,
        learning_source: 'human_intervention'
      });

      // Extract and store patterns
      await this.extractAndStorePatterns(originalMessage, humanResponse);

      console.log('✅ [UNKNOWN LEARNING] Captured human response as training data');

    } catch (error) {
      console.error('❌ [UNKNOWN LEARNING] Error capturing human response:', error);
    }
  }

  // Extract patterns from successful human interventions
  private async extractAndStorePatterns(
    originalMessage: string,
    humanResponse: string
  ): Promise<void> {
    const keywords = this.extractKeywords(originalMessage);
    const intent = this.detectIntent(originalMessage);
    
    const patternKey = `${intent}_${keywords.slice(0, 3).join('_')}`;
    
    if (this.patterns.has(patternKey)) {
      const existing = this.patterns.get(patternKey)!;
      existing.successfulResponses.push(humanResponse);
      existing.confidence = Math.min(1.0, existing.confidence + 0.1);
    } else {
      this.patterns.set(patternKey, {
        keywords,
        intent,
        confidence: 0.6,
        successfulResponses: [humanResponse]
      });
    }
  }

  // Check if we can now handle a previously unknown message type
  async checkForLearnedPatterns(messageContent: string): Promise<string | null> {
    try {
      const keywords = this.extractKeywords(messageContent);
      const intent = this.detectIntent(messageContent);
      
      // Look for matching patterns
      for (const [patternKey, pattern] of this.patterns) {
        const keywordMatch = keywords.some(keyword => 
          pattern.keywords.includes(keyword)
        );
        
        const intentMatch = pattern.intent === intent;
        
        if ((keywordMatch || intentMatch) && pattern.confidence > 0.7) {
          console.log('🎯 [UNKNOWN LEARNING] Found learned pattern match');
          
          // Return the most recent successful response as template
          const responses = pattern.successfulResponses;
          return responses[responses.length - 1];
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ [UNKNOWN LEARNING] Error checking learned patterns:', error);
      return null;
    }
  }

  // Simple keyword extraction
  private extractKeywords(message: string): string[] {
    const words = message.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(' ')
      .filter(word => word.length > 3);
    
    return [...new Set(words)].slice(0, 10);
  }

  // Simple intent detection
  private detectIntent(message: string): string {
    const text = message.toLowerCase();
    
    if (text.includes('price') || text.includes('cost') || text.includes('payment')) {
      return 'pricing_inquiry';
    } else if (text.includes('appointment') || text.includes('schedule') || text.includes('meet')) {
      return 'appointment_request';
    } else if (text.includes('trade') || text.includes('sell my')) {
      return 'trade_inquiry';
    } else if (text.includes('financing') || text.includes('loan') || text.includes('credit')) {
      return 'financing_inquiry';
    } else if (text.includes('?')) {
      return 'general_question';
    } else {
      return 'general_statement';
    }
  }

  // Get unknown message statistics
  async getUnknownMessageStats(): Promise<{
    totalUnknown: number;
    recentUnknown: number;
    resolvedCount: number;
    learnedPatterns: number;
  }> {
    try {
      const { data: unknownOutcomes } = await supabase
        .from('ai_learning_outcomes')
        .select('*')
        .eq('outcome_type', 'response_received')
        .contains('message_characteristics', { unknown_scenario: true });

      const { data: resolvedOutcomes } = await supabase
        .from('ai_learning_outcomes')
        .select('*')
        .eq('outcome_type', 'message_sent')
        .contains('lead_characteristics', { learned_from_human: true });

      const recentCutoff = new Date();
      recentCutoff.setDate(recentCutoff.getDate() - 7);

      const recentUnknown = unknownOutcomes?.filter(
        outcome => new Date(outcome.created_at) > recentCutoff
      ).length || 0;

      return {
        totalUnknown: unknownOutcomes?.length || 0,
        recentUnknown,
        resolvedCount: resolvedOutcomes?.length || 0,
        learnedPatterns: this.patterns.size
      };
    } catch (error) {
      console.error('❌ [UNKNOWN LEARNING] Error getting stats:', error);
      return {
        totalUnknown: 0,
        recentUnknown: 0,
        resolvedCount: 0,
        learnedPatterns: 0
      };
    }
  }
}

export const unknownMessageLearning = new UnknownMessageLearningService();
