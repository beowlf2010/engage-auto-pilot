
// Enhanced trade intent detection for intelligent conversation AI
export const analyzeTradeIntent = (conversationHistory: string, lastCustomerMessage: string) => {
  const message = lastCustomerMessage.toLowerCase();
  const history = conversationHistory.toLowerCase();
  
  // Trade interest patterns with confidence scoring
  const tradePatterns = [
    // Direct trade mentions
    { pattern: /\b(trade\s*in|trading\s*in|trade\s*my|current\s*car|my\s*car)\b/, confidence: 0.9, type: 'direct_trade' },
    { pattern: /\b(sell\s*my|get\s*rid\s*of|replace\s*my)\b/, confidence: 0.8, type: 'sell_current' },
    { pattern: /\b(worth|value|estimate|appraisal)\b/, confidence: 0.8, type: 'valuation_interest' },
    
    // Financial indicators
    { pattern: /\b(payoff|owe\s*on|financing|loan|payment)\b/, confidence: 0.7, type: 'financial_discussion' },
    { pattern: /\b(upside\s*down|underwater|negative\s*equity)\b/, confidence: 0.9, type: 'underwater_loan' },
    
    // Vehicle change motivations
    { pattern: /\b(upgrade|downsize|different\s*car|new\s*car)\b/, confidence: 0.7, type: 'vehicle_change' },
    { pattern: /\b(problems|issues|repairs|maintenance)\b/, confidence: 0.6, type: 'vehicle_problems' },
    
    // Timeline indicators
    { pattern: /\b(need\s*to\s*sell|have\s*to\s*get\s*rid|urgent)\b/, confidence: 0.8, type: 'urgent_trade' },
    { pattern: /\b(thinking\s*about|considering|might)\b/, confidence: 0.5, type: 'considering_trade' }
  ];
  
  let detectedIntents = [];
  let maxConfidence = 0;
  let tradeType = 'general';
  
  // Check each pattern
  for (const { pattern, confidence, type } of tradePatterns) {
    if (pattern.test(message)) {
      detectedIntents.push({ type, confidence, matched: true });
      if (confidence > maxConfidence) {
        maxConfidence = confidence;
        tradeType = type;
      }
    }
  }
  
  // Extract vehicle information
  const vehicleInfo = extractVehicleInfo(message);
  
  // Context analysis - check if we've been discussing vehicles or financing
  const hasVehicleContext = /\b(car|vehicle|auto|truck|suv|sedan|financing|payment)\b/.test(history);
  const recentlyDiscussedTrade = /\b(trade|sell|value|appraisal)\b/.test(history);
  
  // Adjust confidence based on context
  if (hasVehicleContext && maxConfidence > 0) {
    maxConfidence = Math.min(1.0, maxConfidence + 0.1);
  }
  
  if (recentlyDiscussedTrade && maxConfidence > 0) {
    maxConfidence = Math.min(1.0, maxConfidence + 0.15);
  }
  
  // Boost confidence if vehicle details are mentioned
  if (Object.keys(vehicleInfo).length > 0) {
    maxConfidence = Math.min(1.0, maxConfidence + 0.2);
  }
  
  // Determine urgency
  let urgency = 'medium';
  if (/\b(urgent|asap|need\s*to\s*sell|have\s*to\s*get\s*rid)\b/.test(message)) {
    urgency = 'high';
  } else if (/\b(eventually|someday|thinking\s*about|considering)\b/.test(message)) {
    urgency = 'low';
  }
  
  return {
    hasTradeIntent: maxConfidence >= 0.6,
    confidence: maxConfidence,
    intents: detectedIntents,
    tradeType,
    urgency,
    detectedVehicleInfo: vehicleInfo,
    shouldOfferAppraisal: maxConfidence >= 0.7,
    contextFactors: {
      hasVehicleContext,
      recentlyDiscussedTrade,
      conversationLength: conversationHistory.split('\n').length
    }
  };
};

// Extract vehicle information from message text
const extractVehicleInfo = (message: string) => {
  const vehicleInfo: any = {};
  
  // Extract year (look for 4-digit numbers that could be years)
  const yearMatch = message.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[0]);
    if (year >= 1990 && year <= new Date().getFullYear() + 1) {
      vehicleInfo.year = year;
    }
  }

  // Common car makes (simplified list for analysis)
  const makes = ['toyota', 'honda', 'ford', 'chevrolet', 'chevy', 'nissan', 'hyundai', 'kia', 'mazda', 'subaru', 'bmw', 'mercedes', 'audi', 'lexus', 'tesla'];
  
  for (const make of makes) {
    if (message.includes(make)) {
      vehicleInfo.make = make;
      break;
    }
  }

  // Extract mileage
  const mileageMatch = message.match(/\b(\d{1,3}(?:,\d{3})*)\s*(?:miles?|mi|k)\b/);
  if (mileageMatch) {
    const mileage = parseInt(mileageMatch[1].replace(/,/g, ''));
    if (mileage > 0 && mileage < 500000) {
      vehicleInfo.mileage = mileage;
    }
  }

  return vehicleInfo;
};

// Generate trade-specific follow-up suggestions
export const generateTradeFollowUp = (tradeAnalysis: any, leadInfo: any) => {
  const { confidence, tradeType, urgency, detectedVehicleInfo } = tradeAnalysis;
  
  if (confidence < 0.6) return null;
  
  let suggestions = [];
  
  // High confidence - direct trade assistance
  if (confidence >= 0.8) {
    if (tradeType === 'valuation_interest') {
      suggestions.push({
        type: 'valuation_offer',
        message: "I can help you get an accurate valuation for your current vehicle. Would you like me to provide an estimate?",
        action: 'offer_valuation'
      });
    } else if (tradeType === 'urgent_trade') {
      suggestions.push({
        type: 'urgent_assistance',
        message: "I understand you need to move quickly with your trade. Let me connect you with our appraisal team right away.",
        action: 'schedule_appraisal'
      });
    } else {
      suggestions.push({
        type: 'trade_assistance',
        message: "I'd be happy to help with your trade-in. We offer competitive values and can handle all the paperwork.",
        action: 'discuss_trade'
      });
    }
  }
  
  // Medium confidence - gentle trade exploration
  else if (confidence >= 0.6) {
    suggestions.push({
      type: 'trade_inquiry',
      message: "Are you considering trading in your current vehicle? We offer fair market values and make the process easy.",
      action: 'explore_trade'
    });
  }
  
  // Add vehicle-specific suggestions if details were detected
  if (Object.keys(detectedVehicleInfo).length > 0) {
    const vehicleDesc = [
      detectedVehicleInfo.year,
      detectedVehicleInfo.make,
      detectedVehicleInfo.model
    ].filter(Boolean).join(' ');
    
    if (vehicleDesc) {
      suggestions.push({
        type: 'vehicle_specific',
        message: `For your ${vehicleDesc}, I can provide a quick estimate based on current market conditions.`,
        action: 'vehicle_estimate',
        vehicleInfo: detectedVehicleInfo
      });
    }
  }
  
  return {
    suggestions,
    confidence,
    urgency,
    recommendedAction: confidence >= 0.8 ? 'immediate_trade_assistance' : 'trade_exploration'
  };
};
