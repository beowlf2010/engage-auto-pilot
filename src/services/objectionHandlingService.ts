
export interface ObjectionSignal {
  type: 'price' | 'timing' | 'features' | 'trust' | 'decision' | 'general';
  confidence: number;
  keywords: string[];
  suggestedResponse: string;
}

export const detectObjectionSignals = (message: string): ObjectionSignal[] => {
  const text = message.toLowerCase();
  const signals: ObjectionSignal[] = [];

  // Decision/not ready objections
  if (text.includes('decided not to') || text.includes('not purchasing') || 
      text.includes('not buying') || text.includes('changed my mind') ||
      text.includes('not interested anymore') || text.includes('at this time')) {
    signals.push({
      type: 'decision',
      confidence: 0.9,
      keywords: ['decided not to', 'not purchasing', 'at this time'],
      suggestedResponse: 'acknowledge_future_contact'
    });
  }

  // Timing objections
  if (text.includes('not the right time') || text.includes('maybe later') ||
      text.includes('in the future') || text.includes('next year')) {
    signals.push({
      type: 'timing',
      confidence: 0.8,
      keywords: ['not the right time', 'future', 'later'],
      suggestedResponse: 'timing_follow_up'
    });
  }

  // Price objections
  if (text.includes('too expensive') || text.includes('can\'t afford') ||
      text.includes('out of budget') || text.includes('price')) {
    signals.push({
      type: 'price',
      confidence: 0.85,
      keywords: ['expensive', 'afford', 'budget', 'price'],
      suggestedResponse: 'price_discussion'
    });
  }

  return signals;
};

export const generateObjectionResponse = (signals: ObjectionSignal[], customerName: string): string => {
  if (signals.length === 0) return '';

  const primarySignal = signals[0];
  
  switch (primarySignal.type) {
    case 'decision':
      return `Thanks for letting me know, ${customerName}! I completely understand. I'll keep your info and reach out in a few months to see if anything changes. Best of luck with everything!`;
    
    case 'timing':
      return `No problem at all, ${customerName}! Timing is everything. When you're ready to look again, just give me a call. I'll be here to help!`;
    
    case 'price':
      return `I understand, ${customerName}. Let me see what options we might have that could work better for your budget. Would you be open to discussing some alternatives?`;
    
    default:
      return `Thanks for letting me know, ${customerName}! I appreciate your honesty. Feel free to reach out if anything changes - I'm here whenever you need help!`;
  }
};
