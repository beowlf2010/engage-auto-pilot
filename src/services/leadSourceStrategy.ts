
import { LeadSourceData, LeadSourceCategory, SourceConversationStrategy } from '@/types/leadSource';

class LeadSourceStrategyService {
  
  categorizeLeadSource(source: string): LeadSourceCategory {
    const sourceMap: Record<string, LeadSourceCategory> = {
      'autotrader': 'high_intent_digital',
      'cars.com': 'high_intent_digital',
      'cars': 'high_intent_digital',
      'cargurus': 'value_focused',
      'carmax': 'value_focused',
      'truecar': 'value_focused',
      'vroom': 'value_focused',
      'credit application': 'credit_ready',
      'credit_application': 'credit_ready',
      'financing': 'credit_ready',
      'loan': 'credit_ready',
      'website': 'direct_inquiry',
      'phone': 'direct_inquiry',
      'walk-in': 'direct_inquiry',
      'dealership': 'direct_inquiry',
      'facebook': 'social_discovery',
      'instagram': 'social_discovery',
      'social': 'social_discovery',
      'referral': 'referral_based',
      'friend': 'referral_based',
      'family': 'referral_based',
      'service': 'service_related',
      'service department': 'service_related'
    };

    const normalizedSource = source.toLowerCase().trim();
    
    // Check for exact matches first
    if (sourceMap[normalizedSource]) {
      return sourceMap[normalizedSource];
    }

    // Check for partial matches
    for (const [key, category] of Object.entries(sourceMap)) {
      if (normalizedSource.includes(key) || key.includes(normalizedSource)) {
        return category;
      }
    }

    return 'unknown';
  }

  getLeadSourceData(source: string): LeadSourceData {
    const category = this.categorizeLeadSource(source);
    
    const strategyMap: Record<LeadSourceCategory, Omit<LeadSourceData, 'source' | 'sourceCategory'>> = {
      high_intent_digital: {
        urgencyLevel: 'high',
        pricingTier: 'value',
        communicationStyle: 'professional',
        expectedResponseTime: 2,
        conversionProbability: 0.7
      },
      value_focused: {
        urgencyLevel: 'medium',
        pricingTier: 'budget',
        communicationStyle: 'friendly',
        expectedResponseTime: 4,
        conversionProbability: 0.6
      },
      credit_ready: {
        urgencyLevel: 'immediate',
        pricingTier: 'value',
        communicationStyle: 'professional',
        expectedResponseTime: 1,
        conversionProbability: 0.8
      },
      direct_inquiry: {
        urgencyLevel: 'medium',
        pricingTier: 'premium',
        communicationStyle: 'professional',
        expectedResponseTime: 3,
        conversionProbability: 0.65
      },
      social_discovery: {
        urgencyLevel: 'low',
        pricingTier: 'value',
        communicationStyle: 'casual',
        expectedResponseTime: 8,
        conversionProbability: 0.4
      },
      referral_based: {
        urgencyLevel: 'medium',
        pricingTier: 'premium',
        communicationStyle: 'friendly',
        expectedResponseTime: 4,
        conversionProbability: 0.75
      },
      service_related: {
        urgencyLevel: 'low',
        pricingTier: 'value',
        communicationStyle: 'professional',
        expectedResponseTime: 6,
        conversionProbability: 0.5
      },
      unknown: {
        urgencyLevel: 'medium',
        pricingTier: 'value',
        communicationStyle: 'professional',
        expectedResponseTime: 4,
        conversionProbability: 0.5
      }
    };

    return {
      source,
      sourceCategory: category,
      ...strategyMap[category]
    };
  }

  getConversationStrategy(category: LeadSourceCategory): SourceConversationStrategy {
    const strategies: Record<LeadSourceCategory, SourceConversationStrategy> = {
      high_intent_digital: {
        category,
        initialTone: 'confident and action-oriented',
        keyFocusAreas: ['immediate availability', 'competitive pricing', 'quick response', 'vehicle condition'],
        avoidanceTopics: ['lengthy explanations', 'upselling'],
        responseTemplates: {
          greeting: "Hi {name}! I see you found us on {source}. That {vehicle} is available and I'd love to help you with it!",
          pricing: "Our price is competitive - I can verify our current best offer and any available incentives for you right now.",
          availability: "Yes, that vehicle is available! I can have it ready for you to see today if you'd like.",
          followUp: "I know you're shopping around - let me know if you have any quick questions about this one!"
        },
        conversationGoals: ['Quick response', 'Immediate appointment', 'Address price concerns'],
        urgencyHandling: 'immediate'
      },
      value_focused: {
        category,
        initialTone: 'helpful and value-oriented',
        keyFocusAreas: ['value proposition', 'financing options', 'cost savings', 'vehicle history'],
        avoidanceTopics: ['high-pressure tactics', 'premium features'],
        responseTemplates: {
          greeting: "Hi {name}! I see you're looking at the {vehicle}. Great choice - let me show you why this is excellent value!",
          pricing: "I understand you're looking for the best deal. Let me break down the value you're getting and our financing options.",
          availability: "This vehicle is available, and I can also show you similar options that might save you even more.",
          followUp: "I want to make sure you get the best value. Have you had a chance to compare our pricing?"
        },
        conversationGoals: ['Demonstrate value', 'Show cost savings', 'Flexible financing'],
        urgencyHandling: 'same_day'
      },
      credit_ready: {
        category,
        initialTone: 'reassuring and solution-focused',
        keyFocusAreas: ['financing approval', 'payment options', 'credit solutions', 'trust building'],
        avoidanceTopics: ['credit judgment', 'complex terms'],
        responseTemplates: {
          greeting: "Hi {name}! Thanks for your interest in financing. I'm here to help you get approved and find the right vehicle!",
          pricing: "Let's focus on a payment that works for your budget. I can work with various credit situations.",
          availability: "We have several vehicles that work well with our financing programs. Let me find the best fit for you.",
          followUp: "How did the financing discussion go? I'm here to help with any questions about approval or payments."
        },
        conversationGoals: ['Financing approval', 'Payment comfort', 'Build confidence'],
        urgencyHandling: 'immediate'
      },
      direct_inquiry: {
        category,
        initialTone: 'professional and consultative',
        keyFocusAreas: ['personal service', 'detailed information', 'relationship building', 'expertise'],
        avoidanceTopics: ['rushing', 'generic responses'],
        responseTemplates: {
          greeting: "Hi {name}! Thank you for contacting Jason Pilger Chevrolet directly. I'm excited to help you with the {vehicle}!",
          pricing: "I'd be happy to provide detailed pricing information and explain all the options available to you.",
          availability: "Let me check the exact status and options for that vehicle and get back to you with complete details.",
          followUp: "I want to make sure I'm providing everything you need. What other information can I help you with?"
        },
        conversationGoals: ['Build relationship', 'Provide expertise', 'Personalized service'],
        urgencyHandling: 'same_day'
      },
      social_discovery: {
        category,
        initialTone: 'friendly and approachable',
        keyFocusAreas: ['social proof', 'community connection', 'lifestyle fit', 'easy process'],
        avoidanceTopics: ['high pressure', 'complex details'],
        responseTemplates: {
          greeting: "Hi {name}! Thanks for reaching out from {source}! I'd love to help you learn more about the {vehicle}.",
          pricing: "I can share pricing info and make this super easy for you - no complicated back and forth!",
          availability: "That one's available! I can send you some photos or set up an easy time to check it out.",
          followUp: "Hope you're having a great day! Any other questions about the {vehicle}?"
        },
        conversationGoals: ['Build rapport', 'Make it easy', 'Social connection'],
        urgencyHandling: 'flexible'
      },
      referral_based: {
        category,
        initialTone: 'appreciative and relationship-focused',
        keyFocusAreas: ['referral acknowledgment', 'trust building', 'special attention', 'relationship value'],
        avoidanceTopics: ['treating like cold lead', 'generic approach'],
        responseTemplates: {
          greeting: "Hi {name}! I understand {referrer} referred you to us - that means a lot! I'm excited to help you with the {vehicle}.",
          pricing: "Since you're a referral, I want to make sure you get excellent value. Let me see what we can do for you.",
          availability: "That vehicle is available, and I'll make sure you get the VIP treatment throughout the process.",
          followUp: "I hope we're living up to what {referrer} told you about us! How can I continue to help?"
        },
        conversationGoals: ['Honor referral', 'Exceed expectations', 'Maintain relationships'],
        urgencyHandling: 'same_day'
      },
      service_related: {
        category,
        initialTone: 'appreciative and cross-sell focused',
        keyFocusAreas: ['existing relationship', 'loyalty appreciation', 'service history', 'upgrade benefits'],
        avoidanceTopics: ['treating like new customer', 'ignoring history'],
        responseTemplates: {
          greeting: "Hi {name}! Great to hear from you again! I see you're interested in the {vehicle} - perfect timing!",
          pricing: "As a valued service customer, let me see what special offers we might have available for you.",
          availability: "That vehicle is available, and I can coordinate with our service team for a seamless experience.",
          followUp: "Thanks for continuing to trust us with both your service and vehicle needs!"
        },
        conversationGoals: ['Appreciate loyalty', 'Leverage relationship', 'Seamless experience'],
        urgencyHandling: 'next_day'
      },
      unknown: {
        category,
        initialTone: 'professional and exploratory',
        keyFocusAreas: ['needs discovery', 'general information', 'relationship building'],
        avoidanceTopics: ['assumptions', 'generic approach'],
        responseTemplates: {
          greeting: "Hi {name}! Thank you for your interest in the {vehicle}. I'd love to learn more about what you're looking for!",
          pricing: "I'd be happy to discuss pricing once I understand your needs better. What's most important to you?",
          availability: "That vehicle is available! What would you like to know about it?",
          followUp: "I want to make sure I'm helping you find exactly what you need. What questions do you have?"
        },
        conversationGoals: ['Discover needs', 'Build understanding', 'Flexible approach'],
        urgencyHandling: 'flexible'
      }
    };

    return strategies[category];
  }

  generateSourceAwarePrompt(
    leadSourceData: LeadSourceData,
    strategy: SourceConversationStrategy,
    customerMessage: string,
    leadName: string,
    vehicleInterest: string
  ): string {
    const urgencyNote = leadSourceData.urgencyLevel === 'immediate' 
      ? 'URGENT: This lead expects immediate response' 
      : leadSourceData.urgencyLevel === 'high'
      ? 'HIGH PRIORITY: Quick response expected'
      : 'Standard priority response';

    return `You are Finn, a professional automotive sales assistant at Jason Pilger Chevrolet.

LEAD SOURCE CONTEXT:
- Source: ${leadSourceData.source}
- Category: ${strategy.category}
- Customer Expectation: ${strategy.initialTone}
- ${urgencyNote}

CUSTOMER PROFILE:
- Name: ${leadName}
- Vehicle Interest: ${vehicleInterest}
- Communication Style Expected: ${leadSourceData.communicationStyle}
- Conversion Probability: ${Math.round(leadSourceData.conversionProbability * 100)}%

CONVERSATION STRATEGY FOR ${strategy.category.toUpperCase()}:
- Key Focus Areas: ${strategy.keyFocusAreas.join(', ')}
- Avoid: ${strategy.avoidanceTopics.join(', ')}
- Goals: ${strategy.conversationGoals.join(', ')}
- Response Urgency: ${strategy.urgencyHandling}

SOURCE-SPECIFIC GUIDANCE:
${this.getSourceSpecificGuidance(strategy.category, customerMessage)}

Customer's message: "${customerMessage}"

Respond in a ${leadSourceData.communicationStyle} tone that addresses their ${strategy.keyFocusAreas[0]} concern first, then moves toward ${strategy.conversationGoals[0]}.

Keep response under 160 characters for SMS delivery.`;
  }

  private getSourceSpecificGuidance(category: LeadSourceCategory, message: string): string {
    const guidance: Record<LeadSourceCategory, string> = {
      high_intent_digital: 'Customer is actively shopping and comparing. Be direct about availability and competitive advantages. Mention any online pricing they may have seen.',
      value_focused: 'Customer is price-sensitive. Focus on value proposition, financing options, and cost savings. Address any pricing concerns upfront.',
      credit_ready: 'Customer needs financing. Address approval confidence first, then payment comfort. Avoid discussing credit issues negatively.',
      direct_inquiry: 'Customer chose to contact us directly. Provide personalized attention and detailed information. Build the relationship.',
      social_discovery: 'Customer found us casually through social media. Keep it light, friendly, and low-pressure. Make the process seem easy.',
      referral_based: 'Customer was referred by someone they trust. Acknowledge the referral and live up to the recommendation. Provide VIP treatment.',
      service_related: 'Existing customer looking to upgrade. Appreciate their loyalty and leverage the existing relationship. Coordinate with service.',
      unknown: 'Source unknown - discover their needs and motivation first. Be flexible and adjust based on their responses.'
    };

    return guidance[category];
  }
}

export const leadSourceStrategy = new LeadSourceStrategyService();
