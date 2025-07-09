
export interface EnhancedIntentAnalysis {
  primaryIntent: string;
  confidence: number;
  responseStrategy: string;
  customerContext: {
    emotionalTone: string;
    mentionedVehicle?: string;
    mentionedTopics: string[];
    isFollowUp: boolean;
    urgencyLevel: string;
    buyingSignals: string[];
  };
  suggestedResponse?: string;
}

export const analyzeIntentEnhanced = (
  customerMessage: string,
  conversationHistory: string,
  vehicleInterest: string,
  leadSource?: string
): EnhancedIntentAnalysis => {
  const message = customerMessage.toLowerCase();
  const history = conversationHistory.toLowerCase();
  
  // Detect primary intent
  let primaryIntent = 'general_inquiry';
  let confidence = 0.5;
  let responseStrategy = 'informative';
  
  // Vehicle inquiry patterns
  if (message.match(/\b(tell me about|interested in|looking for|want to know about|show me)\b.*\b(truck|car|suv|sedan|coupe|pickup)\b/)) {
    primaryIntent = 'vehicle_inquiry';
    confidence = 0.9;
    responseStrategy = 'vehicle_focused';
  }
  
  // Expressing interest patterns
  if (message.match(/\b(love|like|interested|excited|perfect|exactly what|that's what)\b/)) {
    primaryIntent = 'expressing_interest';
    confidence = 0.8;
    responseStrategy = 'engagement_building';
  }
  
  // Question patterns
  if (message.includes('?') || message.match(/\b(what|how|when|where|can you|do you|is there)\b/)) {
    primaryIntent = 'asking_question';
    confidence = 0.7;
    responseStrategy = 'direct_answer';
  }
  
  // Ready to buy signals
  if (message.match(/\b(ready|buy|purchase|finance|payment|deal|price|cost|how much|available|appointment)\b/)) {
    primaryIntent = 'ready_to_buy';
    confidence = 0.9;
    responseStrategy = 'sales_acceleration';
  }
  
  // Test drive signals (separate from ready to buy due to geographic constraints)
  if (message.match(/\b(test drive|drive|try|experience)\b/)) {
    primaryIntent = 'test_drive_request';
    confidence = 0.85;
    responseStrategy = 'geographic_assessment';
  }
  
  // Objection patterns
  if (message.match(/\b(too expensive|can't afford|not sure|thinking about|need to think|maybe later|not ready)\b/)) {
    primaryIntent = 'objection';
    confidence = 0.8;
    responseStrategy = 'objection_handling';
  }
  
  // Detect emotional tone
  let emotionalTone = 'neutral';
  if (message.match(/\b(excited|love|amazing|perfect|great|awesome)\b/)) {
    emotionalTone = 'excited';
  } else if (message.match(/\b(concerned|worried|not sure|hesitant|doubt)\b/)) {
    emotionalTone = 'concerned';
  } else if (message.match(/\b(urgent|asap|soon|need|must|quickly)\b/)) {
    emotionalTone = 'urgent';
  }
  
  // Extract mentioned vehicle
  const vehicleMatch = message.match(/\b(silverado|equinox|tahoe|suburban|malibu|camaro|corvette|blazer|traverse|truck|suv|sedan)\b/);
  const mentionedVehicle = vehicleMatch ? vehicleMatch[0] : vehicleInterest;
  
  // Detect topics
  const mentionedTopics = [];
  if (message.match(/\b(price|cost|payment|finance|lease)\b/)) mentionedTopics.push('pricing');
  if (message.match(/\b(feature|option|equipment|technology)\b/)) mentionedTopics.push('features');
  if (message.match(/\b(warranty|service|maintenance)\b/)) mentionedTopics.push('service');
  if (message.match(/\b(trade|trade-in|current vehicle)\b/)) mentionedTopics.push('trade');
  if (message.match(/\b(test drive|appointment|visit|come in)\b/)) mentionedTopics.push('appointment');
  
  // Detect urgency level
  let urgencyLevel = 'low';
  if (message.match(/\b(urgent|asap|today|tomorrow|this week)\b/)) {
    urgencyLevel = 'high';
  } else if (message.match(/\b(soon|next week|this month)\b/)) {
    urgencyLevel = 'medium';
  }
  
  // Detect buying signals
  const buyingSignals = [];
  if (message.match(/\b(ready|buy|purchase)\b/)) buyingSignals.push('ready_to_buy');
  if (message.match(/\b(test drive|drive|try)\b/)) buyingSignals.push('wants_test_drive');
  if (message.match(/\b(appointment|visit|come in)\b/)) buyingSignals.push('wants_appointment');
  if (message.match(/\b(finance|payment|lease)\b/)) buyingSignals.push('discussing_finance');
  if (message.match(/\b(available|in stock|when can)\b/)) buyingSignals.push('checking_availability');
  
  // Check if this is a follow-up
  const isFollowUp = history.includes('customer:') && history.includes('sales:');
  
  return {
    primaryIntent,
    confidence,
    responseStrategy,
    customerContext: {
      emotionalTone,
      mentionedVehicle,
      mentionedTopics,
      isFollowUp,
      urgencyLevel,
      buyingSignals
    }
  };
};
