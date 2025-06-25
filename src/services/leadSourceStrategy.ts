
// Lead source strategy service for categorizing and analyzing lead sources
import { LeadSourceData, LeadSourceCategory } from '@/types/leadSource';

export function getLeadSourceData(source: string): LeadSourceData {
  const lowerSource = source.toLowerCase().trim();
  
  // High intent digital platforms
  if (lowerSource.includes('autotrader') || 
      lowerSource.includes('cars.com') || 
      lowerSource.includes('carmax') ||
      lowerSource.includes('truecar')) {
    return {
      source,
      sourceCategory: 'high_intent_digital',
      urgencyLevel: 'high',
      pricingTier: 'premium',
      communicationStyle: 'professional',
      expectedResponseTime: 2,
      conversionProbability: 0.85
    };
  }
  
  // Value-focused platforms
  if (lowerSource.includes('cargurus') || 
      lowerSource.includes('pre-qualified') ||
      lowerSource.includes('prequalified')) {
    return {
      source,
      sourceCategory: 'value_focused',
      urgencyLevel: 'medium',
      pricingTier: 'value',
      communicationStyle: 'friendly',
      expectedResponseTime: 4,
      conversionProbability: 0.75
    };
  }
  
  // Credit-ready sources
  if (lowerSource.includes('credit application') ||
      lowerSource.includes('accelerate') ||
      lowerSource.includes('financing') ||
      lowerSource.includes('loan')) {
    return {
      source,
      sourceCategory: 'credit_ready',
      urgencyLevel: 'immediate',
      pricingTier: 'premium',
      communicationStyle: 'professional',
      expectedResponseTime: 1,
      conversionProbability: 0.90
    };
  }
  
  // Direct inquiries
  if (lowerSource.includes('website') ||
      lowerSource.includes('contact form') ||
      lowerSource.includes('direct') ||
      lowerSource.includes('organic')) {
    return {
      source,
      sourceCategory: 'direct_inquiry',
      urgencyLevel: 'medium',
      pricingTier: 'value',
      communicationStyle: 'professional',
      expectedResponseTime: 3,
      conversionProbability: 0.60
    };
  }
  
  // Social media discovery
  if (lowerSource.includes('facebook') ||
      lowerSource.includes('instagram') ||
      lowerSource.includes('social') ||
      lowerSource.includes('meta')) {
    return {
      source,
      sourceCategory: 'social_discovery',
      urgencyLevel: 'low',
      pricingTier: 'budget',
      communicationStyle: 'casual',
      expectedResponseTime: 6,
      conversionProbability: 0.45
    };
  }
  
  // Referral-based sources
  if (lowerSource.includes('referral') ||
      lowerSource.includes('repeat') ||
      lowerSource.includes('previous customer') ||
      lowerSource.includes('word of mouth')) {
    return {
      source,
      sourceCategory: 'referral_based',
      urgencyLevel: 'medium',
      pricingTier: 'value',
      communicationStyle: 'friendly',
      expectedResponseTime: 4,
      conversionProbability: 0.70
    };
  }
  
  // Service-related
  if (lowerSource.includes('service') ||
      lowerSource.includes('parts') ||
      lowerSource.includes('maintenance')) {
    return {
      source,
      sourceCategory: 'service_related',
      urgencyLevel: 'low',
      pricingTier: 'budget',
      communicationStyle: 'professional',
      expectedResponseTime: 8,
      conversionProbability: 0.55
    };
  }
  
  // Default fallback for unknown sources
  return {
    source,
    sourceCategory: 'unknown',
    urgencyLevel: 'low',
    pricingTier: 'budget',
    communicationStyle: 'casual',
    expectedResponseTime: 6,
    conversionProbability: 0.40
  };
}

// Export a service object that matches what centralizedAIService expects
export const leadSourceStrategy = {
  getLeadSourceData
};
