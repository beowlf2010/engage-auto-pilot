
export interface CustomerIntent {
  primary: string;
  confidence: number;
  context: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  responseStrategy: string;
  financialReadiness: 'ready' | 'saving' | 'exploring' | 'not_ready';
}

export interface FinancingSignal {
  type: 'down_payment' | 'monthly_payment' | 'saving_up' | 'credit_concern' | 'budget_constraint';
  confidence: number;
  keywords: string[];
  suggestedResponse: string;
}

class EnhancedIntentRecognition {
  private financingPatterns = [
    { pattern: /\b(down payment|downpayment|dp)\b/i, type: 'down_payment' as const, confidence: 0.9 },
    { pattern: /\b(monthly payment|payments|monthly)\b/i, type: 'monthly_payment' as const, confidence: 0.8 },
    { pattern: /\b(saving up|save up|saving money)\b/i, type: 'saving_up' as const, confidence: 0.9 },
    { pattern: /\b(credit|financing|finance|loan)\b/i, type: 'credit_concern' as const, confidence: 0.7 },
    { pattern: /\b(budget|afford|expensive|cost)\b/i, type: 'budget_constraint' as const, confidence: 0.6 }
  ];

  private readinessPatterns = [
    { pattern: /\b(ready to buy|want to purchase|let's do this)\b/i, readiness: 'ready' as const, confidence: 0.9 },
    { pattern: /\b(saving up|need time|maybe later)\b/i, readiness: 'saving' as const, confidence: 0.8 },
    { pattern: /\b(looking|browsing|exploring)\b/i, readiness: 'exploring' as const, confidence: 0.6 },
    { pattern: /\b(not ready|not interested|maybe later)\b/i, readiness: 'not_ready' as const, confidence: 0.8 }
  ];

  analyzeLatestMessage(message: string): CustomerIntent {
    const text = message.toLowerCase().trim();
    
    // Detect financing signals
    const financingSignals = this.detectFinancingSignals(text);
    const financialReadiness = this.assessFinancialReadiness(text);
    
    // Determine primary intent
    let primaryIntent = 'general_inquiry';
    let confidence = 0.5;
    let responseStrategy = 'provide_information';
    let urgency: 'low' | 'medium' | 'high' | 'critical' = 'medium';

    if (financingSignals.length > 0) {
      const topSignal = financingSignals[0];
      primaryIntent = `financing_${topSignal.type}`;
      confidence = topSignal.confidence;
      responseStrategy = this.getFinancingResponseStrategy(topSignal.type, financialReadiness);
      urgency = financialReadiness === 'ready' ? 'high' : 'medium';
    }

    // Check for buying signals
    if (text.includes('ready') || text.includes('purchase') || text.includes('buy')) {
      primaryIntent = 'buying_signal';
      confidence = 0.9;
      responseStrategy = 'facilitate_purchase';
      urgency = 'critical';
    }

    // Check for objections
    if (text.includes('not interested') || text.includes('too expensive') || text.includes('think about it')) {
      primaryIntent = 'objection';
      confidence = 0.8;
      responseStrategy = 'address_objection';
      urgency = 'high';
    }

    return {
      primary: primaryIntent,
      confidence,
      context: message.substring(0, 100),
      urgency,
      responseStrategy,
      financialReadiness
    };
  }

  private detectFinancingSignals(text: string): FinancingSignal[] {
    const signals: FinancingSignal[] = [];

    for (const pattern of this.financingPatterns) {
      const matches = text.match(pattern.pattern);
      if (matches) {
        signals.push({
          type: pattern.type,
          confidence: pattern.confidence,
          keywords: Array.from(matches),
          suggestedResponse: this.getFinancingResponse(pattern.type)
        });
      }
    }

    return signals.sort((a, b) => b.confidence - a.confidence);
  }

  private assessFinancialReadiness(text: string): 'ready' | 'saving' | 'exploring' | 'not_ready' {
    for (const pattern of this.readinessPatterns) {
      if (pattern.pattern.test(text)) {
        return pattern.readiness;
      }
    }
    return 'exploring';
  }

  private getFinancingResponseStrategy(type: string, readiness: string): string {
    if (type === 'saving_up') {
      return readiness === 'ready' ? 'discuss_financing_options' : 'empathetic_timeline';
    }
    if (type === 'down_payment') {
      return 'explain_financing_programs';
    }
    if (type === 'monthly_payment') {
      return 'discuss_payment_options';
    }
    return 'provide_financing_info';
  }

  private getFinancingResponse(type: string): string {
    const responses = {
      down_payment: "I understand you're thinking about the down payment. We have several financing programs that can help minimize your upfront cost.",
      monthly_payment: "Let's discuss payment options that work with your budget. We have flexible financing available.",
      saving_up: "I appreciate you being thoughtful about your purchase. When you're ready, we'll have great financing options available.",
      credit_concern: "We work with customers of all credit situations. Let me connect you with our finance team to explore your options.",
      budget_constraint: "I understand budget is important. Let's find a solution that works for your financial situation."
    };
    return responses[type as keyof typeof responses] || "Let me help you explore your financing options.";
  }
}

export const enhancedIntentRecognition = new EnhancedIntentRecognition();
