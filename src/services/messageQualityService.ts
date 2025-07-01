
interface QualityMetrics {
  score: number;
  factors: string[];
  isValid: boolean;
  issues: string[];
}

interface QualityInsights {
  averageQuality: number;
  bestPerformingTypes: string[];
  improvementAreas: string[];
}

class MessageQualityService {
  async trackMessagePerformance(
    messageId: string,
    leadId: string,
    responseReceived: boolean,
    responseTimeHours?: number
  ): Promise<void> {
    try {
      console.log('📊 [QUALITY] Tracking message performance:', {
        messageId,
        leadId,
        responseReceived,
        responseTimeHours
      });

      // In a real implementation, this would store to database
      // For now, we'll just log the tracking
      
    } catch (error) {
      console.error('❌ [QUALITY] Error tracking message performance:', error);
    }
  }

  async getQualityInsights(): Promise<QualityInsights> {
    try {
      console.log('📈 [QUALITY] Getting quality insights...');

      // Mock insights - in real implementation, would query database
      return {
        averageQuality: 0.78,
        bestPerformingTypes: ['question_response', 'vehicle_inquiry'],
        improvementAreas: ['greeting', 'follow_up']
      };
    } catch (error) {
      console.error('❌ [QUALITY] Error getting quality insights:', error);
      return {
        averageQuality: 0,
        bestPerformingTypes: [],
        improvementAreas: []
      };
    }
  }

  validateMessageQuality(message: string): QualityMetrics {
    const issues: string[] = [];
    const factors: string[] = [];
    
    // Basic validation
    if (!message || message.trim().length === 0) {
      issues.push('Message is empty');
    } else {
      factors.push('non_empty_message');
    }
    
    if (message.length < 10) {
      issues.push('Message too short');
    } else if (message.length > 500) {
      issues.push('Message too long');
    } else {
      factors.push('appropriate_length');
    }
    
    // Content quality checks
    if (message.includes('Hi') || message.includes('Hello')) {
      factors.push('personalized_greeting');
    }
    
    if (message.includes('?')) {
      factors.push('engaging_question');
    }
    
    const score = Math.max(0, Math.min(1, factors.length * 0.25));
    
    return {
      score,
      factors,
      isValid: issues.length === 0,
      issues
    };
  }
}

export const messageQualityService = new MessageQualityService();
