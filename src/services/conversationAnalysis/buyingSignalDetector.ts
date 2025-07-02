
export interface BuyingSignal {
  type: 'high_intent' | 'ready_to_buy' | 'price_shopping' | 'comparison' | 'objection' | 'information_seeking';
  strength: number; // 0-1 scale
  indicators: string[];
  suggestedResponse: string;
  urgencyLevel: 'immediate' | 'high' | 'medium' | 'low';
}

export const detectBuyingSignals = (
  conversationHistory: string,
  latestMessage: string
): BuyingSignal[] => {
  const fullText = `${conversationHistory} ${latestMessage}`.toLowerCase();
  const signals: BuyingSignal[] = [];

  // High intent signals
  const highIntentPatterns = [
    { pattern: /\b(when can i|schedule|test drive|come in|visit)\b/i, strength: 0.9 },
    { pattern: /\b(available|in stock|can i see)\b/i, strength: 0.8 },
    { pattern: /\b(price|cost|how much|payment)\b/i, strength: 0.7 },
  ];

  highIntentPatterns.forEach(({ pattern, strength }) => {
    if (pattern.test(fullText)) {
      signals.push({
        type: 'high_intent',
        strength,
        indicators: [pattern.source],
        suggestedResponse: 'Move towards scheduling appointment or providing specific information',
        urgencyLevel: strength > 0.8 ? 'immediate' : 'high'
      });
    }
  });

  // Ready to buy signals
  const readyToBuyPatterns = [
    { pattern: /\b(buy|purchase|get|take|need)\b.*\b(today|now|asap)\b/i, strength: 0.95 },
    { pattern: /\b(financing|finance|loan|payment plan)\b/i, strength: 0.8 },
    { pattern: /\b(trade in|trade-in)\b/i, strength: 0.7 },
  ];

  readyToBuyPatterns.forEach(({ pattern, strength }) => {
    if (pattern.test(fullText)) {
      signals.push({
        type: 'ready_to_buy',
        strength,
        indicators: [pattern.source],
        suggestedResponse: 'Facilitate immediate next steps - appointment, paperwork, etc.',
        urgencyLevel: 'immediate'
      });
    }
  });

  // Price shopping signals
  const priceShoppingPatterns = [
    { pattern: /\b(best price|deal|discount|negotiate)\b/i, strength: 0.8 },
    { pattern: /\b(other dealer|competition|cheaper)\b/i, strength: 0.9 },
  ];

  priceShoppingPatterns.forEach(({ pattern, strength }) => {
    if (pattern.test(fullText)) {
      signals.push({
        type: 'price_shopping',
        strength,
        indicators: [pattern.source],
        suggestedResponse: 'Focus on value proposition and unique benefits',
        urgencyLevel: 'high'
      });
    }
  });

  // Objection signals
  const objectionPatterns = [
    { pattern: /\b(too expensive|can't afford|over budget)\b/i, strength: 0.9 },
    { pattern: /\b(think about it|need time|not sure)\b/i, strength: 0.6 },
    { pattern: /\b(wife|husband|spouse).*(talk|discuss)\b/i, strength: 0.7 },
    { pattern: /\b(hold off|holding off|wait|waiting)\b/i, strength: 0.8 },
    { pattern: /\b(save up|saving up|need to save|save money)\b/i, strength: 0.85 },
    { pattern: /\b(not ready|timing|right time)\b/i, strength: 0.7 },
  ];

  objectionPatterns.forEach(({ pattern, strength }) => {
    if (pattern.test(fullText)) {
      signals.push({
        type: 'objection',
        strength,
        indicators: [pattern.source],
        suggestedResponse: 'Address concerns empathetically and provide solutions',
        urgencyLevel: 'medium'
      });
    }
  });

  // Information seeking
  const infoSeekingPatterns = [
    { pattern: /\b(what|how|tell me|explain|features|specs)\b/i, strength: 0.5 },
    { pattern: /\b(mpg|gas mileage|fuel economy|warranty)\b/i, strength: 0.6 },
  ];

  infoSeekingPatterns.forEach(({ pattern, strength }) => {
    if (pattern.test(fullText)) {
      signals.push({
        type: 'information_seeking',
        strength,
        indicators: [pattern.source],
        suggestedResponse: 'Provide detailed information and guide towards next step',
        urgencyLevel: 'low'
      });
    }
  });

  return signals
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 3); // Return top 3 signals
};

export const generateResponseStrategy = (signals: BuyingSignal[]): {
  primaryStrategy: string;
  talkingPoints: string[];
  callToAction: string;
  urgencyLevel: 'immediate' | 'high' | 'medium' | 'low';
} => {
  if (signals.length === 0) {
    return {
      primaryStrategy: 'build_rapport',
      talkingPoints: ['Ask discovery questions', 'Understand needs better'],
      callToAction: 'Continue conversation',
      urgencyLevel: 'low'
    };
  }

  const topSignal = signals[0];
  
  const strategies = {
    high_intent: {
      primaryStrategy: 'facilitate_action',
      talkingPoints: ['Confirm availability', 'Schedule appointment', 'Provide specific details'],
      callToAction: 'Schedule test drive or appointment',
      urgencyLevel: topSignal.urgencyLevel
    },
    ready_to_buy: {
      primaryStrategy: 'close_deal',
      talkingPoints: ['Discuss financing options', 'Address final concerns', 'Move to paperwork'],
      callToAction: 'Schedule appointment to complete purchase',
      urgencyLevel: 'immediate' as const
    },
    price_shopping: {
      primaryStrategy: 'value_proposition',
      talkingPoints: ['Highlight unique benefits', 'Discuss total value', 'Compare apples to apples'],
      callToAction: 'Schedule in-person evaluation',
      urgencyLevel: topSignal.urgencyLevel
    },
    objection: {
      primaryStrategy: 'address_concerns',
      talkingPoints: ['Listen to concerns', 'Provide solutions', 'Offer alternatives'],
      callToAction: 'Schedule consultation to discuss options',
      urgencyLevel: topSignal.urgencyLevel
    },
    information_seeking: {
      primaryStrategy: 'educate_and_guide',
      talkingPoints: ['Provide detailed information', 'Ask follow-up questions', 'Build expertise'],
      callToAction: 'Offer to show vehicle in person',
      urgencyLevel: topSignal.urgencyLevel
    },
    comparison: {
      primaryStrategy: 'differentiate',
      talkingPoints: ['Highlight competitive advantages', 'Address comparison points', 'Focus on unique value'],
      callToAction: 'Schedule side-by-side comparison',
      urgencyLevel: topSignal.urgencyLevel
    }
  };

  return strategies[topSignal.type] || strategies.information_seeking;
};
