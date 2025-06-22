
export interface DetectedIntent {
  type: 'buying_signal' | 'objection' | 'information_request' | 'scheduling' | 'pricing_inquiry' | 'comparison_request';
  confidence: number;
  keywords: string[];
  context: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface ConversationIntent {
  primaryIntent: DetectedIntent;
  secondaryIntents: DetectedIntent[];
  overallUrgency: 'low' | 'medium' | 'high' | 'critical';
  nextBestAction: string;
}

class IntentRecognitionService {
  private buyingSignalPatterns = [
    { pattern: /\b(ready to buy|want to purchase|interested in buying|let's do this|i'll take it)\b/i, confidence: 0.9, urgency: 'critical' as const },
    { pattern: /\b(when can i|schedule|appointment|come in|test drive)\b/i, confidence: 0.8, urgency: 'high' as const },
    { pattern: /\b(financing|payment|monthly|down payment|trade)\b/i, confidence: 0.7, urgency: 'high' as const },
    { pattern: /\b(perfect|exactly what|love it|looks great)\b/i, confidence: 0.6, urgency: 'medium' as const }
  ];

  private objectionPatterns = [
    { pattern: /\b(too expensive|can't afford|over budget|too much money)\b/i, confidence: 0.9, urgency: 'high' as const },
    { pattern: /\b(think about it|need time|not ready|maybe later)\b/i, confidence: 0.8, urgency: 'medium' as const },
    { pattern: /\b(not interested|not looking|stop calling|remove me)\b/i, confidence: 0.9, urgency: 'critical' as const },
    { pattern: /\b(but|however|concerned|worried|problem)\b/i, confidence: 0.5, urgency: 'medium' as const }
  ];

  private informationRequestPatterns = [
    { pattern: /\b(tell me about|more information|details|specs|features)\b/i, confidence: 0.8, urgency: 'medium' as const },
    { pattern: /\b(what|how|when|where|why)\b/i, confidence: 0.6, urgency: 'low' as const },
    { pattern: /\b(available|in stock|inventory|colors|options)\b/i, confidence: 0.7, urgency: 'medium' as const }
  ];

  private schedulingPatterns = [
    { pattern: /\b(schedule|appointment|meet|visit|come in|see)\b/i, confidence: 0.8, urgency: 'high' as const },
    { pattern: /\b(when are you|what time|available|open)\b/i, confidence: 0.7, urgency: 'medium' as const }
  ];

  private pricingPatterns = [
    { pattern: /\b(price|cost|how much|payment|monthly|financing)\b/i, confidence: 0.8, urgency: 'high' as const },
    { pattern: /\b(discount|deal|special|promotion|rebate)\b/i, confidence: 0.7, urgency: 'medium' as const }
  ];

  private comparisonPatterns = [
    { pattern: /\b(compare|versus|vs|difference|better|which)\b/i, confidence: 0.7, urgency: 'medium' as const },
    { pattern: /\b(other dealers|competitors|shopping around)\b/i, confidence: 0.8, urgency: 'high' as const }
  ];

  analyzeIntent(messageText: string, conversationHistory?: string): ConversationIntent {
    const detectedIntents: DetectedIntent[] = [];
    const text = messageText.toLowerCase();

    // Analyze buying signals
    this.buyingSignalPatterns.forEach(({ pattern, confidence, urgency }) => {
      const matches = text.match(pattern);
      if (matches) {
        detectedIntents.push({
          type: 'buying_signal',
          confidence,
          keywords: Array.from(matches),
          context: this.extractContext(messageText, matches[0]),
          urgency
        });
      }
    });

    // Analyze objections
    this.objectionPatterns.forEach(({ pattern, confidence, urgency }) => {
      const matches = text.match(pattern);
      if (matches) {
        detectedIntents.push({
          type: 'objection',
          confidence,
          keywords: Array.from(matches),
          context: this.extractContext(messageText, matches[0]),
          urgency
        });
      }
    });

    // Analyze information requests
    this.informationRequestPatterns.forEach(({ pattern, confidence, urgency }) => {
      const matches = text.match(pattern);
      if (matches) {
        detectedIntents.push({
          type: 'information_request',
          confidence,
          keywords: Array.from(matches),
          context: this.extractContext(messageText, matches[0]),
          urgency
        });
      }
    });

    // Analyze scheduling intent
    this.schedulingPatterns.forEach(({ pattern, confidence, urgency }) => {
      const matches = text.match(pattern);
      if (matches) {
        detectedIntents.push({
          type: 'scheduling',
          confidence,
          keywords: Array.from(matches),
          context: this.extractContext(messageText, matches[0]),
          urgency
        });
      }
    });

    // Analyze pricing inquiries
    this.pricingPatterns.forEach(({ pattern, confidence, urgency }) => {
      const matches = text.match(pattern);
      if (matches) {
        detectedIntents.push({
          type: 'pricing_inquiry',
          confidence,
          keywords: Array.from(matches),
          context: this.extractContext(messageText, matches[0]),
          urgency
        });
      }
    });

    // Analyze comparison requests
    this.comparisonPatterns.forEach(({ pattern, confidence, urgency }) => {
      const matches = text.match(pattern);
      if (matches) {
        detectedIntents.push({
          type: 'comparison_request',
          confidence,
          keywords: Array.from(matches),
          context: this.extractContext(messageText, matches[0]),
          urgency
        });
      }
    });

    // Sort by confidence and determine primary intent
    detectedIntents.sort((a, b) => b.confidence - a.confidence);
    
    const primaryIntent = detectedIntents[0] || {
      type: 'information_request' as const,
      confidence: 0.3,
      keywords: [],
      context: messageText.substring(0, 50),
      urgency: 'low' as const
    };

    const secondaryIntents = detectedIntents.slice(1);
    const overallUrgency = this.calculateOverallUrgency(detectedIntents);
    const nextBestAction = this.generateNextBestAction(primaryIntent, conversationHistory);

    return {
      primaryIntent,
      secondaryIntents,
      overallUrgency,
      nextBestAction
    };
  }

  private extractContext(text: string, keyword: string, contextLength: number = 30): string {
    const index = text.toLowerCase().indexOf(keyword.toLowerCase());
    if (index === -1) return text.substring(0, contextLength);
    
    const start = Math.max(0, index - contextLength / 2);
    const end = Math.min(text.length, index + keyword.length + contextLength / 2);
    
    return text.substring(start, end).trim();
  }

  private calculateOverallUrgency(intents: DetectedIntent[]): 'low' | 'medium' | 'high' | 'critical' {
    if (intents.some(intent => intent.urgency === 'critical')) return 'critical';
    if (intents.some(intent => intent.urgency === 'high')) return 'high';
    if (intents.some(intent => intent.urgency === 'medium')) return 'medium';
    return 'low';
  }

  private generateNextBestAction(primaryIntent: DetectedIntent, conversationHistory?: string): string {
    switch (primaryIntent.type) {
      case 'buying_signal':
        return 'Schedule immediate appointment or begin closing process';
      case 'objection':
        return 'Address objection directly with empathy and solutions';
      case 'scheduling':
        return 'Provide available appointment times immediately';
      case 'pricing_inquiry':
        return 'Provide transparent pricing with financing options';
      case 'comparison_request':
        return 'Highlight unique value propositions and competitive advantages';
      case 'information_request':
      default:
        return 'Provide detailed information and ask qualifying questions';
    }
  }
}

export const intentRecognitionService = new IntentRecognitionService();
