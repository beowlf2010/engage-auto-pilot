
// Lead source strategy service for categorizing and analyzing lead sources
export interface LeadSourceData {
  sourceCategory: string;
  urgencyLevel: string;
  conversionProbability: number;
  messageIntensity: string;
  expectedResponseTime: number;
}

export function getLeadSourceData(source: string): LeadSourceData {
  const lowerSource = source.toLowerCase().trim();
  
  // High intent digital platforms
  if (lowerSource.includes('autotrader') || 
      lowerSource.includes('cars.com') || 
      lowerSource.includes('carmax') ||
      lowerSource.includes('truecar')) {
    return {
      sourceCategory: 'high_intent_digital',
      urgencyLevel: 'high',
      conversionProbability: 0.85,
      messageIntensity: 'standard',
      expectedResponseTime: 2
    };
  }
  
  // Value-focused platforms
  if (lowerSource.includes('cargurus') || 
      lowerSource.includes('pre-qualified') ||
      lowerSource.includes('prequalified')) {
    return {
      sourceCategory: 'value_focused',
      urgencyLevel: 'medium',
      conversionProbability: 0.75,
      messageIntensity: 'gentle',
      expectedResponseTime: 4
    };
  }
  
  // Credit-ready sources
  if (lowerSource.includes('credit application') ||
      lowerSource.includes('accelerate') ||
      lowerSource.includes('financing') ||
      lowerSource.includes('loan')) {
    return {
      sourceCategory: 'credit_ready',
      urgencyLevel: 'immediate',
      conversionProbability: 0.90,
      messageIntensity: 'aggressive',
      expectedResponseTime: 1
    };
  }
  
  // Direct inquiries
  if (lowerSource.includes('website') ||
      lowerSource.includes('contact form') ||
      lowerSource.includes('direct') ||
      lowerSource.includes('organic')) {
    return {
      sourceCategory: 'direct_inquiry',
      urgencyLevel: 'medium',
      conversionProbability: 0.60,
      messageIntensity: 'standard',
      expectedResponseTime: 3
    };
  }
  
  // Social media discovery
  if (lowerSource.includes('facebook') ||
      lowerSource.includes('instagram') ||
      lowerSource.includes('social') ||
      lowerSource.includes('meta')) {
    return {
      sourceCategory: 'social_discovery',
      urgencyLevel: 'low',
      conversionProbability: 0.45,
      messageIntensity: 'gentle',
      expectedResponseTime: 6
    };
  }
  
  // Referral-based sources
  if (lowerSource.includes('referral') ||
      lowerSource.includes('repeat') ||
      lowerSource.includes('previous customer') ||
      lowerSource.includes('word of mouth')) {
    return {
      sourceCategory: 'referral_based',
      urgencyLevel: 'medium',
      conversionProbability: 0.70,
      messageIntensity: 'gentle',
      expectedResponseTime: 4
    };
  }
  
  // Service-related
  if (lowerSource.includes('service') ||
      lowerSource.includes('parts') ||
      lowerSource.includes('maintenance')) {
    return {
      sourceCategory: 'service_related',
      urgencyLevel: 'low',
      conversionProbability: 0.55,
      messageIntensity: 'gentle',
      expectedResponseTime: 8
    };
  }
  
  // Default fallback for unknown sources
  return {
    sourceCategory: 'other',
    urgencyLevel: 'low',
    conversionProbability: 0.40,
    messageIntensity: 'gentle',
    expectedResponseTime: 6
  };
}

// Export a service object that matches what centralizedAIService expects
export const leadSourceStrategy = {
  getLeadSourceData
};
