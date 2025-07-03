
export interface DetectedIntent {
  type: 'buying_signal' | 'objection' | 'information_request' | 'scheduling' | 'pricing_inquiry' | 'comparison_request' | 'browsing_stage' | 'identity_question' | 'vehicle_specific' | 'transportation_need';
  confidence: number;
  keywords: string[];
  context: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  vehicleDetails?: {
    make?: string;
    model?: string;
    year?: number;
    extractedText?: string;
  };
}

export interface ConversationIntent {
  primaryIntent: DetectedIntent;
  secondaryIntents: DetectedIntent[];
  overallUrgency: 'low' | 'medium' | 'high' | 'critical';
  nextBestAction: string;
}

class IntentRecognitionService {
  private identityPatterns = [
    { pattern: /\b(who are you|who is you|who am i talking to|who is this)\b/i, confidence: 0.95, urgency: 'high' as const },
    { pattern: /\b(what is your name|your name|introduce yourself)\b/i, confidence: 0.9, urgency: 'medium' as const },
    { pattern: /\b(who am i speaking with|what's your name)\b/i, confidence: 0.85, urgency: 'medium' as const }
  ];

  private browsingStagePatterns = [
    { pattern: /\b(just looking|just browsing|shopping around|getting a feel|seeing what's out there)\b/i, confidence: 0.95, urgency: 'low' as const },
    { pattern: /\b(researching|comparing|looking around|window shopping)\b/i, confidence: 0.85, urgency: 'low' as const },
    { pattern: /\b(not ready to buy|not buying today|just exploring)\b/i, confidence: 0.9, urgency: 'low' as const }
  ];

  private transportationNeedPatterns = [
    { pattern: /\b(just need one to get me|need something to get|need reliable transportation|basic transportation)\b/i, confidence: 0.95, urgency: 'medium' as const },
    { pattern: /\b(just need wheels|need a car to get to|need to get around|get me where)\b/i, confidence: 0.9, urgency: 'medium' as const },
    { pattern: /\b(transportation|commute|daily driving|work commute)\b/i, confidence: 0.8, urgency: 'medium' as const },
    { pattern: /\b(practical|dependable|reliable|economy|fuel efficient)\b/i, confidence: 0.7, urgency: 'low' as const }
  ];

  private buyingSignalPatterns = [
    { pattern: /\b(ready to buy|want to purchase|interested in buying|let's do this|i'll take it)\b/i, confidence: 0.9, urgency: 'critical' as const },
    { pattern: /\b(when can i|schedule|appointment|come in|test drive)\b/i, confidence: 0.8, urgency: 'high' as const },
    { pattern: /\b(financing|payment|monthly|down payment|trade)\b/i, confidence: 0.7, urgency: 'high' as const },
    { pattern: /\b(perfect|exactly what|love it|looks great)\b/i, confidence: 0.6, urgency: 'medium' as const }
  ];

  private objectionPatterns = [
    { pattern: /\b(too expensive|can't afford|over budget|too much money|out of my price range)\b/i, confidence: 0.9, urgency: 'high' as const },
    { pattern: /\b(think about it|need time|not ready|maybe later|need to discuss)\b/i, confidence: 0.8, urgency: 'medium' as const },
    { pattern: /\b(not interested|not looking|stop calling|remove me|don't call)\b/i, confidence: 0.9, urgency: 'critical' as const },
    { pattern: /\b(concerned about|worried about|problem with|issue with)\b/i, confidence: 0.7, urgency: 'high' as const },
    { pattern: /\b(but|however|unfortunately|disappointing)\b/i, confidence: 0.4, urgency: 'medium' as const }
  ];

  private informationRequestPatterns = [
    { pattern: /\b(tell me about|more information|details|specs|features)\b/i, confidence: 0.8, urgency: 'medium' as const },
    { pattern: /\b(what|how|when|where|why)\b/i, confidence: 0.6, urgency: 'low' as const },
    { pattern: /\b(available|in stock|inventory|colors|options)\b/i, confidence: 0.7, urgency: 'medium' as const }
  ];

  private schedulingPatterns = [
    { pattern: /\b(schedule|appointment|meet|visit|come in|see|book)\b/i, confidence: 0.8, urgency: 'high' as const },
    { pattern: /\b(when are you|what time|available|open|hours)\b/i, confidence: 0.7, urgency: 'medium' as const },
    { pattern: /\b(today|tomorrow|this week|next week|weekend)\b/i, confidence: 0.6, urgency: 'high' as const },
    { pattern: /\b(test drive|drive|try out|look at)\b/i, confidence: 0.85, urgency: 'high' as const }
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

    // Analyze identity questions FIRST (highest priority for composite responses)
    this.identityPatterns.forEach(({ pattern, confidence, urgency }) => {
      const matches = text.match(pattern);
      if (matches) {
        detectedIntents.push({
          type: 'identity_question',
          confidence,
          keywords: Array.from(matches),
          context: this.extractContext(messageText, matches[0]),
          urgency
        });
      }
    });

    // Analyze transportation need patterns SECOND (high priority for practical customers)
    this.transportationNeedPatterns.forEach(({ pattern, confidence, urgency }) => {
      const matches = text.match(pattern);
      if (matches) {
        detectedIntents.push({
          type: 'transportation_need',
          confidence,
          keywords: Array.from(matches),
          context: this.extractContext(messageText, matches[0]),
          urgency
        });
      }
    });

    // Analyze browsing stage signals THIRD (high priority for customer experience)
    this.browsingStagePatterns.forEach(({ pattern, confidence, urgency }) => {
      const matches = text.match(pattern);
      if (matches) {
        detectedIntents.push({
          type: 'browsing_stage',
          confidence,
          keywords: Array.from(matches),
          context: this.extractContext(messageText, matches[0]),
          urgency
        });
      }
    });

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
      case 'identity_question':
        return 'Provide professional introduction and ask what would be most helpful';
      case 'transportation_need':
        return 'Acknowledge practical need, focus on reliability and daily use patterns';
      case 'browsing_stage':
        return 'Acknowledge browsing stage, remove pressure, offer light assistance';
      case 'buying_signal':
        return 'Schedule immediate appointment or begin closing process';
      case 'objection':
        return 'Address objection with empathy, explore underlying concerns, offer solutions';
      case 'scheduling':
        return 'Provide available appointment times and confirm details immediately';
      case 'pricing_inquiry':
        return 'Provide transparent pricing with financing options and value proposition';
      case 'comparison_request':
        return 'Highlight unique value propositions and competitive advantages';
      case 'vehicle_specific':
        return 'Provide detailed vehicle information and offer demonstration';
      case 'information_request':
      default:
        return 'Provide detailed information and ask qualifying questions';
    }
  }
}

export const intentRecognitionService = new IntentRecognitionService();
