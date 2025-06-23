
export interface ObjectionSignal {
  type: 'price' | 'timing' | 'features' | 'trust' | 'decision' | 'life_circumstances' | 'general';
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

  // Timing objections - ENHANCED with more patterns
  if (text.includes('not the right time') || text.includes('maybe later') ||
      text.includes('in the future') || text.includes('next year') ||
      text.includes('not ready') || text.includes('couple of months') ||
      text.includes('couple months') || text.includes('few months') ||
      text.includes('check back') || text.includes('will check back') ||
      text.includes('not ready yet') || text.includes('maybe in a') ||
      text.includes('working on getting') || text.includes('getting ready')) {
    signals.push({
      type: 'timing',
      confidence: 0.8,
      keywords: ['not ready', 'couple months', 'check back', 'working on getting'],
      suggestedResponse: 'timing_follow_up'
    });
  }

  // Life circumstances objections - NEW category
  if (text.includes('house ready') || text.includes('getting my house') ||
      text.includes('working on my house') || text.includes('house situation') ||
      text.includes('personal situation') || text.includes('family situation') ||
      text.includes('moving') || text.includes('relocating')) {
    signals.push({
      type: 'life_circumstances',
      confidence: 0.85,
      keywords: ['house ready', 'personal situation', 'moving'],
      suggestedResponse: 'life_circumstances_acknowledgment'
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
    
    case 'life_circumstances':
      return `I completely understand, ${customerName}! Getting your house ready is a big priority. Take your time with that - when you're ready to look at vehicles again, I'll be here to help. Best of luck with everything!`;
    
    case 'price':
      return `I understand, ${customerName}. Let me see what options we might have that could work better for your budget. Would you be open to discussing some alternatives?`;
    
    default:
      return `Thanks for letting me know, ${customerName}! I appreciate your honesty. Feel free to reach out if anything changes - I'm here whenever you need help!`;
  }
};
