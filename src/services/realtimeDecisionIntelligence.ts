
interface DecisionContext {
  leadId: string;
  leadName: string;
  latestMessage: string;
  conversationHistory: string[];
  vehicleInterest: string;
}

interface IntelligentDecision {
  shouldRespond: boolean;
  confidence: number;
  reasoning: string[];
  recommendedAction: string;
}

interface DecisionInsights {
  totalDecisions: number;
  responseRate: number;
  averageConfidence: number;
  topReasons: string[];
}

class RealtimeDecisionIntelligence {
  private decisions: Map<string, IntelligentDecision[]> = new Map();

  async makeIntelligentDecision(
    leadId: string,
    message: string,
    context: DecisionContext
  ): Promise<IntelligentDecision> {
    try {
      console.log('🧠 [DECISION] Making intelligent decision for lead:', leadId);

      const reasoning: string[] = [];
      let shouldRespond = true;
      let confidence = 0.8;
      let recommendedAction = 'respond_immediately';

      // Decision logic
      const messageAge = this.getMessageAge(context);
      const hasRecentResponse = this.hasRecentResponse(context);
      const messageIntent = this.analyzeMessageIntent(message);

      // Age-based decision
      if (messageAge > 24) {
        reasoning.push('Message is older than 24 hours - lower priority');
        confidence -= 0.2;
      } else if (messageAge < 1) {
        reasoning.push('Fresh message - high priority response needed');
        confidence += 0.1;
      }

      // Response history check
      if (hasRecentResponse) {
        reasoning.push('Recent response already sent - avoid over-messaging');
        shouldRespond = false;
        confidence = 0.3;
        recommendedAction = 'wait_for_customer_response';
      }

      // Intent-based decision
      if (messageIntent === 'question' || messageIntent === 'urgent') {
        reasoning.push('Customer question detected - immediate response recommended');
        shouldRespond = true;
        confidence = Math.max(confidence, 0.9);
        recommendedAction = 'respond_immediately';
      }

      const decision: IntelligentDecision = {
        shouldRespond,
        confidence: Math.max(0.1, Math.min(1.0, confidence)),
        reasoning,
        recommendedAction
      };

      // Store decision for analytics
      const leadDecisions = this.decisions.get(leadId) || [];
      leadDecisions.push(decision);
      this.decisions.set(leadId, leadDecisions);

      console.log(`✅ [DECISION] Decision made: ${shouldRespond ? 'RESPOND' : 'WAIT'} (${Math.round(confidence * 100)}% confidence)`);

      return decision;

    } catch (error) {
      console.error('❌ [DECISION] Error making intelligent decision:', error);
      return {
        shouldRespond: false,
        confidence: 0.1,
        reasoning: ['Error in decision processing - defaulting to no response'],
        recommendedAction: 'manual_review'
      };
    }
  }

  async getDecisionIntelligenceInsights(): Promise<DecisionInsights> {
    try {
      console.log('📊 [DECISION] Getting decision intelligence insights...');

      const allDecisions = Array.from(this.decisions.values()).flat();
      const totalDecisions = allDecisions.length;
      const responseDecisions = allDecisions.filter(d => d.shouldRespond);
      
      const responseRate = totalDecisions > 0 ? responseDecisions.length / totalDecisions : 0;
      const averageConfidence = totalDecisions > 0 
        ? allDecisions.reduce((sum, d) => sum + d.confidence, 0) / totalDecisions 
        : 0;

      // Extract top reasons
      const reasonCounts = new Map<string, number>();
      allDecisions.forEach(decision => {
        decision.reasoning.forEach(reason => {
          reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
        });
      });

      const topReasons = Array.from(reasonCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([reason]) => reason);

      return {
        totalDecisions,
        responseRate,
        averageConfidence,
        topReasons
      };

    } catch (error) {
      console.error('❌ [DECISION] Error getting insights:', error);
      return {
        totalDecisions: 0,
        responseRate: 0,
        averageConfidence: 0,
        topReasons: []
      };
    }
  }

  private getMessageAge(context: DecisionContext): number {
    // Mock implementation - would calculate based on actual message timestamp
    return Math.random() * 48; // Random age between 0-48 hours
  }

  private hasRecentResponse(context: DecisionContext): boolean {
    // Mock implementation - would check conversation history for recent outbound messages
    const recentOutbound = context.conversationHistory
      .slice(-3)
      .some(msg => msg.startsWith('Response:'));
    
    return recentOutbound;
  }

  private analyzeMessageIntent(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('urgent') || lowerMessage.includes('asap') || lowerMessage.includes('immediately')) {
      return 'urgent';
    } else if (lowerMessage.includes('?')) {
      return 'question';
    } else if (lowerMessage.includes('thanks') || lowerMessage.includes('thank you')) {
      return 'acknowledgment';
    } else {
      return 'general';
    }
  }
}

export const realtimeDecisionIntelligence = new RealtimeDecisionIntelligence();
