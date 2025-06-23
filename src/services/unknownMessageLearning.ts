export interface UnknownMessageContext {
  conversationHistory: string;
  leadName: string;
  vehicleInterest: string;
  hasConversationalSignals: boolean;
  leadSource?: string;
}

interface UnknownMessageStats {
  totalUnknown: number;
  recentUnknown: number;
  resolvedCount: number;
  learnedPatterns: number;
}

class UnknownMessageLearning {
  async captureUnknownMessage(
    leadId: string,
    messageBody: string,
    context: UnknownMessageContext,
    reason: string
  ): Promise<void> {
    try {
      console.log('📝 [UNKNOWN MESSAGE LEARNING] Capturing unknown message scenario');
      
      // Store in local storage as primary method (database tables don't exist)
      this.storeLocalFallback(leadId, messageBody, context, reason);
      console.log('✅ [UNKNOWN MESSAGE LEARNING] Unknown message captured successfully');
    } catch (error) {
      console.warn('⚠️ [UNKNOWN MESSAGE LEARNING] Error capturing unknown message:', error);
    }
  }

  async captureHumanResponse(
    leadId: string,
    originalMessage: string,
    humanResponse: string,
    originalMessageId?: string
  ): Promise<void> {
    try {
      console.log('🧠 [UNKNOWN MESSAGE LEARNING] Capturing human response for learning');
      
      const learningEntry = {
        leadId,
        originalMessage,
        humanResponse,
        originalMessageId,
        timestamp: new Date().toISOString(),
        type: 'human_intervention'
      };

      // Store in local learning storage
      const learningKey = 'finn_human_learning_data';
      const existing = JSON.parse(localStorage.getItem(learningKey) || '[]');
      existing.push(learningEntry);

      // Keep only the last 100 entries
      if (existing.length > 100) {
        existing.splice(0, existing.length - 100);
      }

      localStorage.setItem(learningKey, JSON.stringify(existing));
      console.log('✅ [UNKNOWN MESSAGE LEARNING] Human response captured for learning');
    } catch (error) {
      console.warn('⚠️ [UNKNOWN MESSAGE LEARNING] Error capturing human response:', error);
    }
  }

  private storeLocalFallback(
    leadId: string,
    messageBody: string,
    context: UnknownMessageContext,
    reason: string
  ): void {
    try {
      const fallbackKey = 'finn_unknown_messages_fallback';
      const existing = JSON.parse(localStorage.getItem(fallbackKey) || '[]');
      
      existing.push({
        leadId,
        messageBody,
        context,
        reason,
        timestamp: new Date().toISOString()
      });

      // Keep only the last 50 entries
      if (existing.length > 50) {
        existing.splice(0, existing.length - 50);
      }

      localStorage.setItem(fallbackKey, JSON.stringify(existing));
      console.log('💾 [UNKNOWN MESSAGE LEARNING] Stored in local fallback');
    } catch (error) {
      console.warn('⚠️ [UNKNOWN MESSAGE LEARNING] Could not store local fallback:', error);
    }
  }

  async checkForLearnedPatterns(messageBody: string): Promise<string | null> {
    try {
      console.log('🔍 [UNKNOWN MESSAGE LEARNING] Checking for learned patterns');
      return this.checkLocalFallback(messageBody);
    } catch (error) {
      console.warn('⚠️ [UNKNOWN MESSAGE LEARNING] Error checking learned patterns:', error);
      return null;
    }
  }

  private checkLocalFallback(messageBody: string): string | null {
    try {
      // Check human learning data first
      const learningKey = 'finn_human_learning_data';
      const learned = JSON.parse(localStorage.getItem(learningKey) || '[]');
      
      const match = learned.find((entry: any) => 
        messageBody.toLowerCase().includes(entry.originalMessage.toLowerCase().substring(0, 30))
      );

      if (match) {
        console.log('💾 [UNKNOWN MESSAGE LEARNING] Found learned pattern from human responses');
        return match.humanResponse;
      }

      // Check fallback learned responses
      const fallbackKey = 'finn_learned_responses_fallback';
      const fallbackLearned = JSON.parse(localStorage.getItem(fallbackKey) || '[]');
      
      const fallbackMatch = fallbackLearned.find((response: any) => 
        messageBody.toLowerCase().includes(response.pattern.toLowerCase())
      );

      if (fallbackMatch) {
        console.log('💾 [UNKNOWN MESSAGE LEARNING] Found learned pattern in local fallback');
        return fallbackMatch.response;
      }

      return null;
    } catch (error) {
      console.warn('⚠️ [UNKNOWN MESSAGE LEARNING] Could not check local fallback:', error);
      return null;
    }
  }

  async getUnknownMessageStats(): Promise<UnknownMessageStats> {
    try {
      const fallbackKey = 'finn_unknown_messages_fallback';
      const unknownMessages = JSON.parse(localStorage.getItem(fallbackKey) || '[]');
      
      const learningKey = 'finn_human_learning_data';
      const learnedResponses = JSON.parse(localStorage.getItem(learningKey) || '[]');

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentUnknown = unknownMessages.filter((msg: any) => 
        new Date(msg.timestamp) > sevenDaysAgo
      ).length;

      return {
        totalUnknown: unknownMessages.length,
        recentUnknown,
        resolvedCount: learnedResponses.length,
        learnedPatterns: learnedResponses.length
      };
    } catch (error) {
      console.warn('⚠️ [UNKNOWN MESSAGE LEARNING] Error getting stats:', error);
      return {
        totalUnknown: 0,
        recentUnknown: 0,
        resolvedCount: 0,
        learnedPatterns: 0
      };
    }
  }

  async markAsResolved(messageId: string, learnedResponse: string): Promise<void> {
    try {
      // For local storage implementation, we'll add to learned responses
      const learnedKey = 'finn_learned_responses_fallback';
      const existing = JSON.parse(localStorage.getItem(learnedKey) || '[]');
      
      existing.push({
        id: messageId,
        pattern: messageId, // Use messageId as pattern identifier
        response: learnedResponse,
        timestamp: new Date().toISOString()
      });

      localStorage.setItem(learnedKey, JSON.stringify(existing));
      console.log('✅ [UNKNOWN MESSAGE LEARNING] Message marked as resolved in local storage');
    } catch (error) {
      console.warn('⚠️ [UNKNOWN MESSAGE LEARNING] Error marking as resolved:', error);
    }
  }
}

export const unknownMessageLearning = new UnknownMessageLearning();
