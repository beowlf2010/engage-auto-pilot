
// Objection Detection and Sales Progression System
// Identifies customer hesitation, objections, and appropriate sales responses

export interface ObjectionSignal {
  type: 'hesitation' | 'price_concern' | 'timing_delay' | 'feature_concern' | 'competitor_mention' | 'vague_response' | 'silence_break';
  confidence: number;
  indicators: string[];
  suggestedResponse: 'probe_deeper' | 'address_price' | 'create_urgency' | 'feature_benefits' | 'competitor_comparison' | 'assumptive_close';
}

export interface SalesProgression {
  currentStage: 'initial_interest' | 'exploring_options' | 'evaluating_features' | 'price_discussion' | 'ready_to_buy' | 'objection_phase' | 'closing_opportunity';
  nextAction: string;
  urgencyLevel: 'low' | 'medium' | 'high';
  closeOpportunity: boolean;
}

// Detect objection signals in customer messages
export const detectObjectionSignals = (customerMessage: string, conversationHistory: string): ObjectionSignal[] => {
  const message = customerMessage.toLowerCase().trim();
  const signals: ObjectionSignal[] = [];

  // Hesitation indicators
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

  // Price concern indicators
  const pricePatterns = [
    { pattern: /\b(too expensive|cost too much|out of budget|can't afford|price is high|expensive|budget)\b/, confidence: 0.9 },
    { pattern: /\b(payment|monthly|financing|down payment|trade|what do i owe)\b/, confidence: 0.6 },
    { pattern: /\b(cheaper|less expensive|lower price|better deal|discount|incentive)\b/, confidence: 0.8 }
  ];

  pricePatterns.forEach(({ pattern, confidence }) => {
    if (pattern.test(message)) {
      signals.push({
        type: 'price_concern',
        confidence,
        indicators: [message],
        suggestedResponse: 'address_price'
      });
    }
  });

  // Timing delay indicators
  const timingPatterns = [
    { pattern: /\b(not ready|waiting|next month|next year|spring|summer|winter|fall|holiday|christmas)\b/, confidence: 0.8 },
    { pattern: /\b(current car|still works|few more months|not urgent|no rush)\b/, confidence: 0.7 },
    { pattern: /\b(decided to wait|putting it off|postpone|delay)\b/, confidence: 0.9 }
  ];

  timingPatterns.forEach(({ pattern, confidence }) => {
    if (pattern.test(message)) {
      signals.push({
        type: 'timing_delay',
        confidence,
        indicators: [message],
        suggestedResponse: 'create_urgency'
      });
    }
  });

  // Feature concern indicators
  const featurePatterns = [
    { pattern: /\b(don't like|not sure about|concerned about|worried about|problem with)\b/, confidence: 0.8 },
    { pattern: /\b(doesn't have|missing|wish it had|need more|looking for)\b/, confidence: 0.7 },
    { pattern: /\b(color|interior|engine|mpg|size|space|features)\b/, confidence: 0.5 }
  ];

  featurePatterns.forEach(({ pattern, confidence }) => {
    if (pattern.test(message)) {
      signals.push({
        type: 'feature_concern',
        confidence,
        indicators: [message],
        suggestedResponse: 'feature_benefits'
      });
    }
  });

  // Competitor mention indicators
  const competitorPatterns = [
    { pattern: /\b(honda|toyota|ford|nissan|ram|gmc|other dealer|elsewhere|competitor)\b/, confidence: 0.9 },
    { pattern: /\b(comparing|looking at other|checking other|other options)\b/, confidence: 0.7 }
  ];

  competitorPatterns.forEach(({ pattern, confidence }) => {
    if (pattern.test(message)) {
      signals.push({
        type: 'competitor_mention',
        confidence,
        indicators: [message],
        suggestedResponse: 'competitor_comparison'
      });
    }
  });

  // Vague/non-committal responses
  const vagePatterns = [
    { pattern: /^(yes|no|ok|sure|maybe|i guess|probably|fine)\.?$/i, confidence: 0.7 },
    { pattern: /\b(we'll see|who knows|hard to say|not sure)\b/, confidence: 0.8 }
  ];

  vagePatterns.forEach(({ pattern, confidence }) => {
    if (pattern.test(message)) {
      signals.push({
        type: 'vague_response',
        confidence,
        indicators: [message],
        suggestedResponse: 'probe_deeper'
      });
    }
  });

  return signals;
};

// Determine sales progression stage and next actions
export const analyzeSalesProgression = (
  customerMessage: string, 
  conversationHistory: string, 
  objectionSignals: ObjectionSignal[]
): SalesProgression => {
  const message = customerMessage.toLowerCase();
  const history = conversationHistory.toLowerCase();

  // Determine current stage
  let currentStage: SalesProgression['currentStage'] = 'initial_interest';
  let urgencyLevel: SalesProgression['urgencyLevel'] = 'low';
  let closeOpportunity = false;

  // Check for buying signals
  const buyingSignals = /\b(when can i|how soon|schedule|appointment|test drive|come in|see it|financing|payment|trade|title|paperwork)\b/;
  const priceInquiry = /\b(price|cost|payment|financing|monthly|down|total)\b/;
  const featureDiscussion = /\b(features|options|package|trim|color|interior|mpg|warranty)\b/;

  if (buyingSignals.test(message) || buyingSignals.test(history)) {
    currentStage = 'ready_to_buy';
    urgencyLevel = 'high';
    closeOpportunity = true;
  } else if (priceInquiry.test(message) || priceInquiry.test(history)) {
    currentStage = 'price_discussion';
    urgencyLevel = 'medium';
  } else if (featureDiscussion.test(message) || featureDiscussion.test(history)) {
    currentStage = 'evaluating_features';
    urgencyLevel = 'medium';
  } else if (objectionSignals.length > 0) {
    currentStage = 'objection_phase';
    urgencyLevel = 'medium';
  } else if (history.includes('customer:') && history.split('customer:').length > 2) {
    currentStage = 'exploring_options';
    urgencyLevel = 'low';
  }

  // Determine next action based on stage and signals
  let nextAction = 'Continue building rapport and understanding needs';

  switch (currentStage) {
    case 'ready_to_buy':
      nextAction = 'Schedule appointment or test drive immediately';
      break;
    case 'price_discussion':
      nextAction = 'Present pricing options and financing solutions';
      break;
    case 'evaluating_features':
      nextAction = 'Highlight key benefits and move toward pricing';
      break;
    case 'objection_phase':
      nextAction = 'Identify and address specific objections';
      break;
    case 'exploring_options':
      nextAction = 'Qualify needs and present specific vehicle matches';
      break;
    default:
      nextAction = 'Build interest and uncover specific vehicle needs';
  }

  return {
    currentStage,
    nextAction,
    urgencyLevel,
    closeOpportunity
  };
};

// Generate objection-handling responses
export const generateObjectionResponse = (
  objectionSignals: ObjectionSignal[],
  salesProgression: SalesProgression,
  customerMessage: string,
  vehicleInterest: string
): string => {
  if (objectionSignals.length === 0) {
    return '';
  }

  const primarySignal = objectionSignals.reduce((prev, current) => 
    current.confidence > prev.confidence ? current : prev
  );

  const cleanVehicle = vehicleInterest.replace(/"/g, '').trim();

  switch (primarySignal.suggestedResponse) {
    case 'probe_deeper':
      return `I understand you want to think it over, Aaron. Is there something specific about the ${cleanVehicle} that's holding you back? Price, timing, or maybe a particular feature you're concerned about?`;

    case 'address_price':
      return `I hear you on the budget concern, Aaron. What monthly payment would feel comfortable for you? We have several financing options that might work better than you think.`;

    case 'create_urgency':
      return `I totally get wanting to wait, Aaron. Just so you know, ${cleanVehicle}s have been moving pretty quickly lately. What would need to happen for you to move forward sooner rather than later?`;

    case 'feature_benefits':
      return `What specific features are most important to you in your next vehicle, Aaron? I want to make sure the ${cleanVehicle} checks all your boxes before we go any further.`;

    case 'competitor_comparison':
      return `Smart to compare options, Aaron. What other vehicles are you considering? I'd love to show you how the ${cleanVehicle} stacks up - there might be some advantages you haven't considered yet.`;

    case 'assumptive_close':
      if (salesProgression.closeOpportunity) {
        return `Based on what you've told me, Aaron, it sounds like the ${cleanVehicle} could be a great fit. When would be a good time for you to come take a look at it in person?`;
      }
      return `What questions can I answer to help you feel confident about moving forward with the ${cleanVehicle}, Aaron?`;

    default:
      return `I want to make sure I'm helping you find exactly what you need, Aaron. What's the most important thing for you to know about the ${cleanVehicle} right now?`;
  }
};
