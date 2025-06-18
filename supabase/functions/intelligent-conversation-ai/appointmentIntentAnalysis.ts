
// Enhanced appointment intent detection with comprehensive patterns
export const analyzeAppointmentIntent = (conversationHistory: string, lastCustomerMessage: string) => {
  const message = lastCustomerMessage.toLowerCase();
  const history = conversationHistory.toLowerCase();
  
  // Appointment interest patterns with confidence scoring
  const appointmentPatterns = [
    // Direct scheduling requests
    { pattern: /\b(schedule|book|set up|arrange)\s+(an?\s+)?(appointment|meeting|time|visit)\b/, confidence: 0.9, type: 'direct_scheduling' },
    { pattern: /\b(when can i|what time|available times?|free times?)\b/, confidence: 0.8, type: 'availability_inquiry' },
    { pattern: /\b(come in|visit|stop by|drop by)\b/, confidence: 0.7, type: 'visit_intent' },
    
    // Test drive specific
    { pattern: /\b(test drive|drive the car|try it out|take it for a spin)\b/, confidence: 0.9, type: 'test_drive' },
    { pattern: /\b(see the car|look at the car|check it out|view the vehicle)\b/, confidence: 0.8, type: 'viewing' },
    
    // Consultation patterns
    { pattern: /\b(talk to someone|speak with|meet with|consultation|discuss)\b/, confidence: 0.8, type: 'consultation' },
    { pattern: /\b(questions|more information|details|learn more)\b/, confidence: 0.6, type: 'consultation' },
    
    // Timing expressions
    { pattern: /\b(today|tomorrow|this week|next week|weekend|saturday|sunday)\b/, confidence: 0.7, type: 'timing_preference' },
    { pattern: /\b(morning|afternoon|evening|after work|lunch time)\b/, confidence: 0.6, type: 'timing_preference' },
    
    // Decision readiness
    { pattern: /\b(ready to buy|want to purchase|interested in buying|make a decision)\b/, confidence: 0.9, type: 'purchase_ready' },
    { pattern: /\b(financing|payment|trade.?in|deal)\b/, confidence: 0.7, type: 'financial_discussion' }
  ];
  
  let detectedIntents = [];
  let maxConfidence = 0;
  let appointmentType = 'consultation';
  
  // Check each pattern
  for (const { pattern, confidence, type } of appointmentPatterns) {
    if (pattern.test(message)) {
      detectedIntents.push({ type, confidence, matched: true });
      if (confidence > maxConfidence) {
        maxConfidence = confidence;
        if (type === 'test_drive') appointmentType = 'test_drive';
        else if (type === 'purchase_ready') appointmentType = 'consultation';
      }
    }
  }
  
  // Context analysis - check if we've been discussing vehicles
  const hasVehicleContext = /\b(car|vehicle|auto|truck|suv|sedan|price|features|specs)\b/.test(history);
  const recentlyDiscussedScheduling = /\b(appointment|schedule|visit|come in)\b/.test(history);
  
  // Adjust confidence based on context
  if (hasVehicleContext && maxConfidence > 0) {
    maxConfidence = Math.min(1.0, maxConfidence + 0.1);
  }
  
  // Determine urgency
  let urgency = 'medium';
  if (/\b(urgent|asap|today|right now|immediately)\b/.test(message)) {
    urgency = 'high';
  } else if (/\b(next week|sometime|when convenient|no rush)\b/.test(message)) {
    urgency = 'low';
  }
  
  // Extract preferred timing if mentioned
  const timePreferences = extractTimePreferences(message);
  
  return {
    hasAppointmentIntent: maxConfidence >= 0.6,
    confidence: maxConfidence,
    intents: detectedIntents,
    suggestedAppointmentType: appointmentType,
    urgency,
    timePreferences,
    shouldSuggestScheduling: maxConfidence >= 0.7,
    contextFactors: {
      hasVehicleContext,
      recentlyDiscussedScheduling,
      conversationLength: conversationHistory.split('\n').length
    }
  };
};

// Extract time preferences from customer message
const extractTimePreferences = (message: string) => {
  const preferences = {
    dayPreferences: [],
    timePreferences: [],
    datePreferences: []
  };
  
  // Day preferences
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'weekday', 'weekend'];
  for (const day of days) {
    if (message.includes(day)) {
      preferences.dayPreferences.push(day);
    }
  }
  
  // Time preferences
  const times = ['morning', 'afternoon', 'evening', 'lunch', 'after work', 'before work'];
  for (const time of times) {
    if (message.includes(time)) {
      preferences.timePreferences.push(time);
    }
  }
  
  // Relative date preferences
  if (message.includes('today')) preferences.datePreferences.push('today');
  if (message.includes('tomorrow')) preferences.datePreferences.push('tomorrow');
  if (message.includes('this week')) preferences.datePreferences.push('this_week');
  if (message.includes('next week')) preferences.datePreferences.push('next_week');
  
  return preferences;
};

// Generate appointment-specific follow-up suggestions
export const generateAppointmentFollowUp = (intentAnalysis: any, leadInfo: any) => {
  const { confidence, suggestedAppointmentType, urgency, timePreferences } = intentAnalysis;
  
  if (confidence < 0.6) return null;
  
  let suggestions = [];
  
  // High confidence - direct scheduling offer
  if (confidence >= 0.8) {
    suggestions.push({
      type: 'direct_offer',
      message: `I'd be happy to schedule ${suggestedAppointmentType === 'test_drive' ? 'a test drive' : 'an appointment'} for you. What day works best?`,
      action: 'schedule_appointment',
      appointmentType: suggestedAppointmentType
    });
  }
  
  // Medium confidence - gentle suggestion
  else if (confidence >= 0.6) {
    suggestions.push({
      type: 'gentle_suggestion',
      message: `Would you like to schedule a time to ${suggestedAppointmentType === 'test_drive' ? 'test drive the vehicle' : 'discuss this in person'}?`,
      action: 'suggest_appointment',
      appointmentType: suggestedAppointmentType
    });
  }
  
  // Add timing-specific suggestions based on preferences
  if (timePreferences.dayPreferences.length > 0 || timePreferences.timePreferences.length > 0) {
    const timingContext = [
      ...timePreferences.dayPreferences,
      ...timePreferences.timePreferences
    ].join(' ');
    
    suggestions.push({
      type: 'timing_accommodation',
      message: `I see you mentioned ${timingContext}. I can check our availability for that time.`,
      action: 'check_availability',
      preferredTiming: timePreferences
    });
  }
  
  return {
    suggestions,
    confidence,
    urgency,
    recommendedAction: confidence >= 0.8 ? 'immediate_scheduling' : 'appointment_suggestion'
  };
};
