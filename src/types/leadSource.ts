
export interface LeadSourceData {
  source: string;
  sourceCategory: LeadSourceCategory;
  urgencyLevel: 'low' | 'medium' | 'high' | 'immediate';
  pricingTier: 'budget' | 'value' | 'premium' | 'luxury';
  communicationStyle: 'formal' | 'casual' | 'professional' | 'friendly';
  expectedResponseTime: number; // hours
  conversionProbability: number; // 0-1
}

export type LeadSourceCategory = 
  | 'high_intent_digital'     // AutoTrader, Cars.com
  | 'value_focused'           // CarGurus, CarMax
  | 'credit_ready'            // Credit applications
  | 'direct_inquiry'          // Website, phone calls
  | 'social_discovery'        // Facebook, Instagram
  | 'referral_based'          // Word of mouth
  | 'service_related'         // Service department
  | 'unknown';

export interface SourceConversationStrategy {
  category: LeadSourceCategory;
  initialTone: string;
  keyFocusAreas: string[];
  avoidanceTopics: string[];
  responseTemplates: {
    greeting: string;
    pricing: string;
    availability: string;
    followUp: string;
  };
  conversationGoals: string[];
  urgencyHandling: 'immediate' | 'same_day' | 'next_day' | 'flexible';
}
