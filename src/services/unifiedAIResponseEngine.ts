
export interface CustomerIntent {
  primary: string;
  confidence: number;
  context: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  responseStrategy: string;
  financialReadiness: 'ready' | 'saving' | 'exploring' | 'not_ready';
}

export interface ResponseTemplate {
  id: string;
  category: string;
  intent: string;
  template: string;
  tone: 'empathetic' | 'professional' | 'consultative' | 'supportive';
  followUpAction?: string;
}

export interface MessageContext {
  leadId: string;
  leadName: string;
  latestMessage: string;
  conversationHistory: string[];
  vehicleInterest?: string;
  previousIntent?: string;
}

export interface UnifiedAIResponse {
  message: string;
  intent: CustomerIntent;
  confidence: number;
  responseStrategy: string;
  followUpAction?: string;
  reasoning: string;
}

class UnifiedAIResponseEngine {
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

  private templates: ResponseTemplate[] = [
    // Financing Templates
    {
      id: 'saving_up_empathetic',
      category: 'financing',
      intent: 'saving_up',
      template: "I completely understand - saving up shows you're being smart about this decision. When you're ready, we'll have financing options that can help minimize your upfront costs. What timeline are you thinking?",
      tone: 'empathetic',
      followUpAction: 'schedule_follow_up'
    },
    {
      id: 'down_payment_concern',
      category: 'financing',
      intent: 'down_payment',
      template: "Great question about the down payment! We have several programs that can help - some as low as $0 down for qualified buyers. Would you like me to check what options might work for your situation?",
      tone: 'consultative',
      followUpAction: 'connect_finance'
    },
    {
      id: 'monthly_payment_focus',
      category: 'financing',
      intent: 'monthly_payment',
      template: "Let's find a payment that fits your budget comfortably. What monthly range were you hoping to stay within? We have flexible terms that might surprise you.",
      tone: 'consultative',
      followUpAction: 'discuss_budget'
    },
    {
      id: 'budget_constraint',
      category: 'financing',
      intent: 'budget_constraint',
      template: "I appreciate you sharing your budget considerations. Let's work together to find something that fits both your needs and your financial comfort zone. What's most important to you in a vehicle?",
      tone: 'supportive',
      followUpAction: 'explore_options'
    },
    // Objection Handling Templates
    {
      id: 'not_ready_timing',
      category: 'objection',
      intent: 'timing',
      template: "I understand the timing might not be perfect right now. What would need to change for this to feel like the right time? I'm here to help when you're ready.",
      tone: 'empathetic',
      followUpAction: 'schedule_follow_up'
    },
    {
      id: 'too_expensive',
      category: 'objection',
      intent: 'price',
      template: "I hear you on the price concern. Let's see if we can find a way to make this work - we have rebates, financing options, and sometimes trade-in value can help bridge the gap. What would make this feel more comfortable for you?",
      tone: 'consultative',
      followUpAction: 'explore_solutions'
    },
    // Buying Signal Templates
    {
      id: 'ready_to_purchase',
      category: 'buying_signal',
      intent: 'purchase_ready',
      template: "That's great to hear! Let's get you moving forward. When would be a good time to finalize everything? I can have all the paperwork ready.",
      tone: 'professional',
      followUpAction: 'schedule_appointment'
    },
    // Information Request Templates
    {
      id: 'general_inquiry',
      category: 'information',
      intent: 'general',
      template: "I'd be happy to help you with that information. What specific details would be most helpful for your decision?",
      tone: 'professional',
      followUpAction: 'provide_details'
    }
  ];

  // Vehicle Interest Validation
  private validateVehicleInterest(vehicleInterest: string | null | undefined) {
    const INVALID_PATTERNS = [
      /^not specified$/i, /^unknown$/i, /^n\/a$/i, /^na$/i, /^null$/i, /^undefined$/i,
      /^none$/i, /^test$/i, /^sample$/i, /^demo$/i, /^vehicle$/i, /^car$/i, /^auto$/i,
      /^automobile$/i, /^\s*-+\s*$/, /^\s*\.+\s*$/
    ];

    const FALLBACK_MESSAGE = "I see you're still exploring options—happy to help you find the right fit!";

    if (!vehicleInterest || typeof vehicleInterest !== 'string') {
      return { isValid: false, sanitizedMessage: FALLBACK_MESSAGE, originalValue: vehicleInterest || '' };
    }

    const trimmed = vehicleInterest.trim();
    if (trimmed.length === 0) {
      return { isValid: false, sanitizedMessage: FALLBACK_MESSAGE, originalValue: vehicleInterest };
    }

    for (const pattern of INVALID_PATTERNS) {
      if (pattern.test(trimmed)) {
        return { isValid: false, sanitizedMessage: FALLBACK_MESSAGE, originalValue: vehicleInterest };
      }
    }

    return {
      isValid: true,
      sanitizedMessage: `your interest in ${trimmed}`,
      originalValue: vehicleInterest
    };
  }

  // Enhanced Intent Analysis
  analyzeIntent(message: string): CustomerIntent {
    const text = message.toLowerCase().trim();
    
    // Detect financing signals
    const financingSignals = this.detectFinancingSignals(text);
    const financialReadiness = this.assessFinancialReadiness(text);
    
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

  private detectFinancingSignals(text: string) {
    const signals: Array<{type: string, confidence: number}> = [];

    for (const pattern of this.financingPatterns) {
      if (pattern.pattern.test(text)) {
        signals.push({
          type: pattern.type,
          confidence: pattern.confidence
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

  // Template Management
  private getTemplate(intent: string, financialReadiness?: string): ResponseTemplate | null {
    let template = this.templates.find(t => t.intent === intent);
    
    if (!template) {
      if (intent.includes('financing')) {
        template = this.templates.find(t => t.category === 'financing');
      } else if (intent.includes('objection')) {
        template = this.templates.find(t => t.category === 'objection');
      }
    }

    if (template && financialReadiness === 'saving') {
      const savingTemplate = this.templates.find(t => t.intent === 'saving_up');
      if (savingTemplate) return savingTemplate;
    }

    return template || this.templates.find(t => t.intent === 'general');
  }

  // Context-Aware Response Generation
  generateResponse(context: MessageContext): UnifiedAIResponse {
    console.log('🎯 [UNIFIED AI] Analyzing latest message:', context.latestMessage.substring(0, 100));

    const intent = this.analyzeIntent(context.latestMessage);
    
    console.log('🧠 [UNIFIED AI] Detected intent:', {
      primary: intent.primary,
      confidence: intent.confidence,
      strategy: intent.responseStrategy,
      financialReadiness: intent.financialReadiness
    });

    const vehicleValidation = this.validateVehicleInterest(context.vehicleInterest);
    
    let responseMessage = this.generateResponseMessage(
      intent,
      context.latestMessage,
      context.leadName,
      intent.financialReadiness
    );

    responseMessage = this.sanitizeResponse(responseMessage, context.leadName);

    if (vehicleValidation.isValid && this.shouldMentionVehicle(intent.primary)) {
      responseMessage = this.addVehicleContext(responseMessage, vehicleValidation.sanitizedMessage);
    }

    const followUpAction = this.getFollowUpAction(intent.primary);

    return {
      message: responseMessage,
      intent,
      confidence: intent.confidence,
      responseStrategy: intent.responseStrategy,
      followUpAction,
      reasoning: `Responded to "${intent.primary}" with ${intent.responseStrategy} strategy. Financial readiness: ${intent.financialReadiness}. Confidence: ${Math.round(intent.confidence * 100)}%`
    };
  }

  private generateResponseMessage(intent: CustomerIntent, customerMessage: string, leadName: string, financialReadiness?: string): string {
    const template = this.getTemplate(intent.primary, financialReadiness);
    
    if (!template) {
      return `Hi ${leadName}! I understand your question about "${customerMessage.substring(0, 50)}..." Let me help you with that. What would be most helpful to know?`;
    }

    let response = template.template;
    
    if (!response.toLowerCase().includes('hi') && !response.toLowerCase().includes('hello')) {
      response = `Hi ${leadName}! ${response}`;
    }

    return response;
  }

  private sanitizeResponse(response: string, leadName: string): string {
    const sanitized = response
      .replace(/\{[^}]*\}/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/not specified/gi, '')
      .replace(/undefined/gi, '')
      .replace(/null/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!sanitized.toLowerCase().includes(leadName.toLowerCase()) && leadName !== 'there') {
      return `Hi ${leadName}! ${sanitized}`;
    }

    return sanitized;
  }

  private shouldMentionVehicle(intent: string): boolean {
    const vehicleRelevantIntents = [
      'general_inquiry',
      'financing_down_payment',
      'financing_monthly_payment',
      'buying_signal'
    ];
    
    return vehicleRelevantIntents.includes(intent);
  }

  private addVehicleContext(response: string, vehicleContext: string): string {
    if (response.includes('?')) {
      const parts = response.split('?');
      const lastPart = parts.pop();
      const mainResponse = parts.join('?');
      return `${mainResponse} regarding ${vehicleContext}?${lastPart}`;
    } else {
      return `${response} I'm here to help with ${vehicleContext}.`;
    }
  }

  private getFollowUpAction(intent: string): string | null {
    const template = this.getTemplate(intent);
    return template?.followUpAction || null;
  }

  // Quality validation
  validateResponseQuality(response: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (response.includes('{') || response.includes('[') || response.includes('undefined') || response.includes('null')) {
      issues.push('Contains placeholder text');
    }

    if (response.toLowerCase().includes('ok') && response.length < 20) {
      issues.push('Response too generic/short');
    }

    if (response.toLowerCase().includes('not specified') || response.toLowerCase().includes('unknown')) {
      issues.push('Contains invalid data references');
    }

    if (!response.toLowerCase().includes('hi') && !response.toLowerCase().includes('hello') && !response.toLowerCase().includes('thanks')) {
      issues.push('Missing appropriate greeting/acknowledgment');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }
}

export const unifiedAIResponseEngine = new UnifiedAIResponseEngine();
