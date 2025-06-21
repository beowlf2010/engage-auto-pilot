// Enhanced Objection Detection with Pricing Discrepancy Support
// Identifies customer pricing concerns, vehicle nicknames, and improved objection handling

export interface EnhancedObjectionSignal {
  type: 'pricing_discrepancy' | 'pricing_shock' | 'online_vs_call_price' | 'upgrade_costs' | 'hesitation' | 'price_concern' | 'timing_delay' | 'feature_concern' | 'competitor_mention' | 'vague_response';
  confidence: number;
  indicators: string[];
  suggestedResponse: 'address_pricing_discrepancy' | 'explain_pricing_breakdown' | 'empathetic_pricing_response' | 'probe_deeper' | 'address_price' | 'create_urgency' | 'feature_benefits' | 'competitor_comparison' | 'assumptive_close';
  vehicleNickname?: string;
  priceContext?: {
    mentionedOnlinePrice?: boolean;
    mentionedCallPrice?: boolean;
    priceDifference?: string;
    upgradesConcern?: boolean;
  };
}

export interface VehicleNickname {
  nickname: string;
  actualVehicle: string;
  make: string;
  confidence: number;
}

// Enhanced vehicle nickname detection
export const detectVehicleNicknames = (message: string): VehicleNickname[] => {
  const text = message.toLowerCase();
  const nicknames: VehicleNickname[] = [];

  // Chevrolet nicknames
  const chevyNicknames = [
    { nickname: 'black widow', actualVehicle: 'Silverado Black Widow Edition', make: 'Chevrolet', confidence: 0.9 },
    { nickname: 'zr2', actualVehicle: 'Colorado ZR2', make: 'Chevrolet', confidence: 0.95 },
    { nickname: 'ss', actualVehicle: 'Camaro SS', make: 'Chevrolet', confidence: 0.8 },
    { nickname: 'z71', actualVehicle: 'Silverado Z71', make: 'Chevrolet', confidence: 0.9 },
    { nickname: 'rst', actualVehicle: 'Silverado RST', make: 'Chevrolet', confidence: 0.85 },
    { nickname: 'redline', actualVehicle: 'Redline Edition', make: 'Chevrolet', confidence: 0.8 },
    { nickname: 'midnight edition', actualVehicle: 'Midnight Edition', make: 'Chevrolet', confidence: 0.85 },
    { nickname: 'trail boss', actualVehicle: 'Silverado Trail Boss', make: 'Chevrolet', confidence: 0.9 }
  ];

  // Check for Chevy nicknames
  chevyNicknames.forEach(item => {
    if (text.includes(item.nickname)) {
      nicknames.push(item);
    }
  });

  // Ford nicknames
  const fordNicknames = [
    { nickname: 'raptor', actualVehicle: 'F-150 Raptor', make: 'Ford', confidence: 0.95 },
    { nickname: 'lightning', actualVehicle: 'F-150 Lightning', make: 'Ford', confidence: 0.95 },
    { nickname: 'tremor', actualVehicle: 'F-150 Tremor', make: 'Ford', confidence: 0.9 },
    { nickname: 'king ranch', actualVehicle: 'F-150 King Ranch', make: 'Ford', confidence: 0.9 }
  ];

  fordNicknames.forEach(item => {
    if (text.includes(item.nickname)) {
      nicknames.push(item);
    }
  });

  return nicknames;
};

// Enhanced objection detection with pricing focus
export const detectEnhancedObjectionSignals = (customerMessage: string, conversationHistory: string): EnhancedObjectionSignal[] => {
  const message = customerMessage.toLowerCase().trim();
  const signals: EnhancedObjectionSignal[] = [];

  // PRICING DISCREPANCY PATTERNS (New - High Priority)
  const pricingDiscrepancyPatterns = [
    { 
      pattern: /\b(different price|price was different|price changed|not the same price)\b.*\b(online|website|called|phone)\b/, 
      confidence: 0.95,
      type: 'pricing_discrepancy' as const,
      response: 'address_pricing_discrepancy' as const
    },
    { 
      pattern: /\b(online.*\$\d+|website.*\$\d+).*\b(called|phone).*\$\d+/, 
      confidence: 0.9,
      type: 'online_vs_call_price' as const,
      response: 'explain_pricing_breakdown' as const
    },
    { 
      pattern: /\b(\$\d+,?\d*)\s*(more|higher|extra).*\b(upgrade|option|package|feature)/, 
      confidence: 0.85,
      type: 'upgrade_costs' as const,
      response: 'explain_pricing_breakdown' as const
    },
    { 
      pattern: /\b(price.*shock|expensive.*expected|cost.*more.*thought)\b/, 
      confidence: 0.8,
      type: 'pricing_shock' as const,
      response: 'empathetic_pricing_response' as const
    }
  ];

  // Check for pricing discrepancy patterns
  pricingDiscrepancyPatterns.forEach(({ pattern, confidence, type, response }) => {
    if (pattern.test(message)) {
      const priceContext = {
        mentionedOnlinePrice: /\b(online|website)\b/.test(message),
        mentionedCallPrice: /\b(called|phone)\b/.test(message),
        priceDifference: message.match(/\$\d+,?\d*/)?.[0] || '',
        upgradesConcern: /\b(upgrade|option|package)\b/.test(message)
      };

      signals.push({
        type,
        confidence,
        indicators: [message],
        suggestedResponse: response,
        priceContext
      });
    }
  });

  // ENHANCED PRICE CONCERN PATTERNS
  const enhancedPricePatterns = [
    { pattern: /\b(too expensive|cost too much|out of budget|can't afford|price is high|expensive|budget)\b/, confidence: 0.9 },
    { pattern: /\b(cheaper|less expensive|lower price|better deal|discount|incentive|negotiate)\b/, confidence: 0.8 },
    { pattern: /\b(payment|monthly|financing|down payment|trade|what do i owe|affordability)\b/, confidence: 0.7 },
    { pattern: /\b(price.*high|cost.*more|expensive.*than)\b/, confidence: 0.75 }
  ];

  enhancedPricePatterns.forEach(({ pattern, confidence }) => {
    if (pattern.test(message)) {
      signals.push({
        type: 'price_concern',
        confidence,
        indicators: [message],
        suggestedResponse: 'address_price'
      });
    }
  });

  // EXISTING PATTERNS (Enhanced)
  const hesitationPatterns = [
    { pattern: /\b(i'll think about it|let me think|need to think|thinking about|not sure|maybe|might|possibly)\b/, confidence: 0.8 },
    { pattern: /\b(i'll get back to you|call you back|let you know|talk it over|discuss with)\b/, confidence: 0.9 },
    { pattern: /\b(still looking|just browsing|just checking|comparing options|shopping around)\b/, confidence: 0.7 },
    { pattern: /^(ok|okay|alright|sure|thanks)\.?$/i, confidence: 0.6 }
  ];

  hesitationPatterns.forEach(({ pattern, confidence }) => {
    if (pattern.test(message)) {
      signals.push({
        type: 'hesitation',
        confidence,
        indicators: [message],
        suggestedResponse: 'probe_deeper'
      });
    }
  });

  // Detect vehicle nicknames
  const detectedNicknames = detectVehicleNicknames(customerMessage);
  if (detectedNicknames.length > 0) {
    // Add nickname context to existing signals
    signals.forEach(signal => {
      if (detectedNicknames[0]) {
        signal.vehicleNickname = detectedNicknames[0].actualVehicle;
      }
    });
  }

  return signals;
};

// Enhanced response generation with pricing empathy
export const generateEnhancedObjectionResponse = (
  objectionSignals: EnhancedObjectionSignal[],
  customerMessage: string,
  vehicleInterest: string,
  leadName: string,
  conversationMemory?: any
): string => {
  if (objectionSignals.length === 0) {
    return '';
  }

  const primarySignal = objectionSignals.reduce((prev, current) => 
    current.confidence > prev.confidence ? current : prev
  );

  const cleanVehicle = vehicleInterest.replace(/"/g, '').trim();
  const vehicleToUse = primarySignal.vehicleNickname || cleanVehicle || 'the vehicle you\'re interested in';
  
  switch (primarySignal.suggestedResponse) {
    case 'address_pricing_discrepancy':
      return `I completely understand your confusion about the pricing, ${leadName}. Online prices typically show the base MSRP and don't include additional packages, options, or dealer fees that might apply to ${vehicleToUse}. Let me clarify exactly what's included in that price difference so there are no surprises. What specific features or packages were mentioned when you called?`;

    case 'explain_pricing_breakdown':
      if (primarySignal.priceContext?.upgradesConcern) {
        return `I hear your concern about the additional costs for upgrades on ${vehicleToUse}, ${leadName}. Those packages and options do add value, but I want to make sure you're getting exactly what you want within your budget. Would you like me to break down what's included in those upgrades and see if we have other trim levels that might work better?`;
      }
      return `Let me explain the pricing breakdown for ${vehicleToUse}, ${leadName}. The difference you're seeing likely includes options, packages, or fees that weren't shown in the online price. I want to be completely transparent with you - what would be a comfortable monthly payment range for you?`;

    case 'empathetic_pricing_response':
      return `I totally understand that pricing surprise, ${leadName} - nobody likes unexpected costs when they're excited about ${vehicleToUse}. Let's work together to find the right solution within your budget. What monthly payment would feel comfortable for you, and are there specific features that are must-haves versus nice-to-haves?`;

    case 'address_price':
      return `I understand budget is a major consideration, ${leadName}. Let's find a way to make ${vehicleToUse} work for you. What monthly payment range feels comfortable? We have financing options and sometimes incentives that can help bring the cost down.`;

    case 'probe_deeper':
      return `I want to make sure I address your main concern about ${vehicleToUse}, ${leadName}. Is it the pricing, timing, or specific features that are holding you back?`;

    default:
      return `Thanks for that feedback about ${vehicleToUse}, ${leadName}. I want to make sure I address your specific concerns - what's your main question right now?`;
  }
};
