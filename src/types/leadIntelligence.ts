export interface BehaviorPattern {
  id: string;
  type: 'engagement' | 'communication' | 'timing' | 'content_preference' | 'decision_making';
  pattern: string;
  frequency: number;
  significance: number;
  lastObserved: string;
  confidence: number;
}

export interface LeadBehaviorProfile {
  leadId: string;
  overallScore: number;
  engagementLevel: 'low' | 'medium' | 'high' | 'very_high';
  communicationStyle: 'formal' | 'casual' | 'technical' | 'brief';
  preferredTiming: {
    days: string[];
    hours: number[];
    timezone: string;
  };
  responsePatterns: {
    averageResponseTime: number;
    preferredChannels: string[];
    messageLength: 'short' | 'medium' | 'long';
  };
  decisionMakingStyle: 'analytical' | 'spontaneous' | 'collaborative' | 'cautious';
  behaviorPatterns: BehaviorPattern[];
  lastAnalyzed: string;
  trendsAnalysis: {
    engagementTrend: 'increasing' | 'stable' | 'decreasing';
    interestLevel: 'growing' | 'maintained' | 'declining';
    urgencyIndicators: string[];
  };
}

export interface IntentSignal {
  id: string;
  type: 'buying' | 'research' | 'comparison' | 'objection' | 'urgency' | 'price_sensitivity';
  signal: string;
  strength: number; // 0-1
  context: string;
  detectedAt: string;
  confidence: number;
  actionTrigger: boolean;
  relatedSignals: string[];
}

export interface IntentProfile {
  leadId: string;
  overallIntentScore: number; // 0-100
  intentCategory: 'browsing' | 'researching' | 'comparing' | 'deciding' | 'ready_to_buy';
  buyingSignals: IntentSignal[];
  timeToDecision: number; // estimated days
  priceRange: {
    min: number;
    max: number;
    sensitivity: 'low' | 'medium' | 'high';
  };
  competitorMentions: string[];
  urgencyFactors: {
    timeConstraints: string[];
    motivationLevel: number;
    pressurePoints: string[];
  };
  lastUpdated: string;
}

export interface CompetitorIntelligence {
  competitorName: string;
  mentionCount: number;
  context: 'comparison' | 'preference' | 'consideration' | 'rejection';
  sentiment: 'positive' | 'neutral' | 'negative';
  specificMentions: {
    features: string[];
    pricing: string[];
    service: string[];
  };
  competitiveAdvantages: string[];
  threats: string[];
  lastMentioned: string;
}

export interface LeadIntelligenceProfile {
  leadId: string;
  behaviorProfile: LeadBehaviorProfile;
  intentProfile: IntentProfile;
  competitorIntelligence: CompetitorIntelligence[];
  intelligenceScore: number; // composite score 0-100
  actionRecommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  riskFactors: {
    churnRisk: number;
    competitorRisk: number;
    priceRisk: number;
  };
  opportunities: {
    upsellPotential: number;
    referralPotential: number;
    loyaltyPotential: number;
  };
  lastAnalyzed: string;
  nextAnalysisAt: string;
}

export interface IntelligenceMetrics {
  totalProfilesAnalyzed: number;
  highIntentLeads: number;
  behaviorPatternsDetected: number;
  competitorThreats: number;
  averageIntelligenceScore: number;
  topIntentSignals: Array<{
    signal: string;
    count: number;
    averageStrength: number;
  }>;
  competitorAnalysis: Array<{
    competitor: string;
    threatLevel: number;
    mentionTrend: 'increasing' | 'stable' | 'decreasing';
  }>;
}