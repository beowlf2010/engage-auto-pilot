
export interface ResponseTemplate {
  id: string;
  category: string;
  intent: string;
  template: string;
  tone: 'empathetic' | 'professional' | 'consultative' | 'supportive';
  followUpAction?: string;
}

export class ProfessionalResponseTemplates {
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

  getTemplate(intent: string, financialReadiness?: string): ResponseTemplate | null {
    // First try to find an exact match
    let template = this.templates.find(t => t.intent === intent);
    
    // If no exact match, try category-based matching
    if (!template) {
      if (intent.includes('financing')) {
        template = this.templates.find(t => t.category === 'financing');
      } else if (intent.includes('objection')) {
        template = this.templates.find(t => t.category === 'objection');
      }
    }

    // Apply readiness-specific logic
    if (template && financialReadiness === 'saving') {
      const savingTemplate = this.templates.find(t => t.intent === 'saving_up');
      if (savingTemplate) return savingTemplate;
    }

    return template || this.templates.find(t => t.intent === 'general');
  }

  generateResponse(intent: string, customerMessage: string, leadName: string, financialReadiness?: string): string {
    const template = this.getTemplate(intent, financialReadiness);
    
    if (!template) {
      return `Hi ${leadName}! I understand your question about "${customerMessage.substring(0, 50)}..." Let me help you with that. What would be most helpful to know?`;
    }

    // Simple template variable replacement
    let response = template.template;
    
    // Add personalization if the message is generic
    if (!response.toLowerCase().includes('hi') && !response.toLowerCase().includes('hello')) {
      response = `Hi ${leadName}! ${response}`;
    }

    return response;
  }

  // Get follow-up action for a given intent
  getFollowUpAction(intent: string): string | null {
    const template = this.getTemplate(intent);
    return template?.followUpAction || null;
  }
}

export const professionalResponseTemplates = new ProfessionalResponseTemplates();
