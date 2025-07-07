import { supabase } from '@/integrations/supabase/client';

// Advanced AI Intelligence System for Finn
export interface SmartFinnAnalysis {
  leadId: string;
  overallIntelligence: number;
  buyingProbability: number;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  buyingSignals: BuyingSignal[];
  objections: ObjectionAnalysis[];
  personalityProfile: PersonalityProfile;
  bestApproach: SalesApproach;
  nextBestActions: NextAction[];
  competitiveThreats: CompetitiveThreat[];
  pricesensitivity: PriceSensitivity;
  decisionMakerStatus: DecisionMakerAnalysis;
  communicationPreferences: CommunicationProfile;
}

export interface BuyingSignal {
  type: 'budget_mentioned' | 'timeline_urgency' | 'feature_interest' | 'comparison_shopping' | 'decision_authority' | 'pain_point_identified';
  strength: number; // 1-10
  evidence: string;
  timeframe: string;
  confidence: number;
}

export interface ObjectionAnalysis {
  objection: string;
  type: 'price' | 'timing' | 'authority' | 'need' | 'trust' | 'competition';
  severity: number; // 1-10
  suggestedResponse: string;
  handlingStrategy: string;
  successProbability: number;
}

export interface PersonalityProfile {
  communicationStyle: 'direct' | 'analytical' | 'expressive' | 'supportive';
  decisionSpeed: 'fast' | 'moderate' | 'slow' | 'deliberate';
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  informationNeed: 'minimal' | 'moderate' | 'detailed' | 'comprehensive';
  relationshipOriented: boolean;
  technicalFocus: boolean;
}

export interface SalesApproach {
  primaryStrategy: string;
  messagingTone: 'professional' | 'friendly' | 'consultative' | 'authoritative';
  contentFocus: string[];
  avoidanceAreas: string[];
  optimalTiming: string;
  recommendedChannel: 'sms' | 'email' | 'phone' | 'in_person';
}

export interface NextAction {
  action: string;
  priority: number; // 1-10
  timeframe: string;
  expectedOutcome: string;
  successProbability: number;
  requiredResources: string[];
}

export interface CompetitiveThreat {
  competitor: string;
  threatLevel: number; // 1-10
  advantagePoints: string[];
  vulnerabilities: string[];
  counterStrategy: string;
}

export interface PriceSensitivity {
  level: 'low' | 'moderate' | 'high' | 'extreme';
  priceRange: { min: number; max: number };
  negotiationPotential: number;
  valueDrivers: string[];
  priceObjections: string[];
}

export interface DecisionMakerAnalysis {
  isPrimaryDecisionMaker: boolean;
  influenceLevel: number; // 1-10
  otherStakeholders: string[];
  decisionProcess: 'individual' | 'committee' | 'family' | 'business';
  approvalRequired: boolean;
}

export interface CommunicationProfile {
  preferredTime: string;
  responsePatterns: string;
  messageLength: 'short' | 'medium' | 'long';
  formalityLevel: 'casual' | 'professional' | 'formal';
  technicalDetail: 'minimal' | 'moderate' | 'extensive';
}

export interface SmartCoachingSuggestion {
  id: string;
  type: 'response_suggestion' | 'strategy_adjustment' | 'timing_optimization' | 'objection_handling' | 'closing_opportunity';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  suggestedAction: string;
  expectedImpact: string;
  riskLevel: 'low' | 'medium' | 'high';
  confidenceScore: number;
  timeframe: string;
}

export interface MarketIntelligence {
  marketConditions: 'hot' | 'warm' | 'cool' | 'cold';
  inventoryDemand: number; // 1-10
  pricePosition: 'premium' | 'competitive' | 'value' | 'discount';
  seasonalFactors: string[];
  competitorActivity: string[];
  marketOpportunities: string[];
}

// Advanced conversation analysis
export const analyzeConversationIntelligence = async (leadId: string): Promise<SmartFinnAnalysis> => {
  try {
    // Get comprehensive lead and conversation data
    const { data: lead } = await supabase
      .from('leads')
      .select(`
        *,
        conversations (*),
        phone_numbers (*),
        customer_journeys (*)
      `)
      .eq('id', leadId)
      .single();

    if (!lead) throw new Error('Lead not found');

    const conversations = lead.conversations || [];
    const incomingMessages = conversations.filter(c => c.direction === 'in');
    const allText = incomingMessages.map(m => m.body.toLowerCase()).join(' ');

    // Analyze buying signals
    const buyingSignals = await detectBuyingSignals(allText, conversations);
    
    // Analyze objections
    const objections = await analyzeObjections(allText, conversations);
    
    // Build personality profile
    const personalityProfile = await buildPersonalityProfile(allText, conversations);
    
    // Determine best sales approach
    const bestApproach = await determineSalesApproach(personalityProfile, buyingSignals, objections);
    
    // Generate next best actions
    const nextBestActions = await generateNextBestActions(lead, buyingSignals, objections, personalityProfile);
    
    // Analyze competitive threats
    const competitiveThreats = await analyzeCompetitiveThreats(allText);
    
    // Assess price sensitivity
    const pricesensitivity = await assessPriceSensitivity(allText, lead);
    
    // Analyze decision maker status
    const decisionMakerStatus = await analyzeDecisionMaker(allText, conversations);
    
    // Build communication preferences
    const communicationPreferences = await buildCommunicationProfile(conversations);

    // Calculate overall intelligence score
    const overallIntelligence = calculateIntelligenceScore(
      buyingSignals, objections, personalityProfile, decisionMakerStatus
    );

    // Calculate buying probability
    const buyingProbability = calculateBuyingProbability(
      buyingSignals, objections, personalityProfile, pricesensitivity
    );

    // Determine urgency level
    const urgencyLevel = determineUrgencyLevel(buyingSignals, allText);

    return {
      leadId,
      overallIntelligence,
      buyingProbability,
      urgencyLevel,
      buyingSignals,
      objections,
      personalityProfile,
      bestApproach,
      nextBestActions,
      competitiveThreats,
      pricesensitivity,
      decisionMakerStatus,
      communicationPreferences
    };
  } catch (error) {
    console.error('Error analyzing conversation intelligence:', error);
    throw error;
  }
};

// Detect buying signals in conversation
const detectBuyingSignals = async (text: string, conversations: any[]): Promise<BuyingSignal[]> => {
  const signals: BuyingSignal[] = [];
  
  // Budget signals
  const budgetPatterns = [
    /budget.*(\$[\d,]+)/gi,
    /price.*range.*(\$[\d,]+)/gi,
    /afford.*(\$[\d,]+)/gi,
    /looking.*spend.*(\$[\d,]+)/gi
  ];
  
  budgetPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      signals.push({
        type: 'budget_mentioned',
        strength: 8,
        evidence: matches[0],
        timeframe: 'current',
        confidence: 85
      });
    }
  });

  // Timeline urgency
  const timelinePatterns = [
    /need.*this week/gi,
    /asap/gi,
    /urgent/gi,
    /soon as possible/gi,
    /by.*\d+.*month/gi
  ];
  
  timelinePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      signals.push({
        type: 'timeline_urgency',
        strength: 9,
        evidence: matches[0],
        timeframe: 'immediate',
        confidence: 90
      });
    }
  });

  // Feature interest
  const featureKeywords = ['love this', 'perfect', 'exactly what', 'features', 'options'];
  featureKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      signals.push({
        type: 'feature_interest',
        strength: 7,
        evidence: keyword,
        timeframe: 'current',
        confidence: 75
      });
    }
  });

  return signals;
};

// Analyze objections in conversation
const analyzeObjections = async (text: string, conversations: any[]): Promise<ObjectionAnalysis[]> => {
  const objections: ObjectionAnalysis[] = [];
  
  // Price objections
  if (text.includes('expensive') || text.includes('too much') || text.includes('price')) {
    objections.push({
      objection: 'Price concern',
      type: 'price',
      severity: 7,
      suggestedResponse: 'Focus on value proposition and financing options',
      handlingStrategy: 'Demonstrate ROI and offer payment solutions',
      successProbability: 70
    });
  }

  // Timing objections
  if (text.includes('not ready') || text.includes('maybe later') || text.includes('think about it')) {
    objections.push({
      objection: 'Timing hesitation',
      type: 'timing',
      severity: 6,
      suggestedResponse: 'Address urgency and limited availability',
      handlingStrategy: 'Create time-sensitive incentives',
      successProbability: 60
    });
  }

  return objections;
};

// Build personality profile from conversation patterns
const buildPersonalityProfile = async (text: string, conversations: any[]): Promise<PersonalityProfile> => {
  const messageCount = conversations.filter(c => c.direction === 'in').length;
  const avgMessageLength = conversations
    .filter(c => c.direction === 'in')
    .reduce((sum, c) => sum + c.body.length, 0) / messageCount || 0;

  // Analyze communication style
  let communicationStyle: 'direct' | 'analytical' | 'expressive' | 'supportive' = 'direct';
  if (text.includes('data') || text.includes('specs') || text.includes('details')) {
    communicationStyle = 'analytical';
  } else if (text.includes('feel') || text.includes('love') || text.includes('excited')) {
    communicationStyle = 'expressive';
  } else if (text.includes('family') || text.includes('help') || text.includes('together')) {
    communicationStyle = 'supportive';
  }

  return {
    communicationStyle,
    decisionSpeed: messageCount > 10 ? 'fast' : 'moderate',
    riskTolerance: text.includes('guarantee') || text.includes('warranty') ? 'conservative' : 'moderate',
    informationNeed: avgMessageLength > 100 ? 'detailed' : 'moderate',
    relationshipOriented: text.includes('recommend') || text.includes('trust'),
    technicalFocus: text.includes('engine') || text.includes('mpg') || text.includes('features')
  };
};

// Determine optimal sales approach
const determineSalesApproach = async (
  personality: PersonalityProfile, 
  signals: BuyingSignal[], 
  objections: ObjectionAnalysis[]
): Promise<SalesApproach> => {
  let strategy = 'consultative selling';
  let tone: 'professional' | 'friendly' | 'consultative' | 'authoritative' = 'consultative';
  
  if (personality.communicationStyle === 'direct') {
    strategy = 'direct approach with clear benefits';
    tone = 'professional';
  } else if (personality.communicationStyle === 'analytical') {
    strategy = 'data-driven presentation';
    tone = 'authoritative';
  } else if (personality.communicationStyle === 'expressive') {
    strategy = 'emotional connection building';
    tone = 'friendly';
  }

  const contentFocus = [];
  if (personality.technicalFocus) contentFocus.push('technical specifications');
  if (personality.relationshipOriented) contentFocus.push('personal service');
  if (signals.some(s => s.type === 'budget_mentioned')) contentFocus.push('value proposition');

  return {
    primaryStrategy: strategy,
    messagingTone: tone,
    contentFocus,
    avoidanceAreas: objections.map(o => o.type),
    optimalTiming: 'business hours',
    recommendedChannel: personality.communicationStyle === 'analytical' ? 'email' : 'sms'
  };
};

// Generate next best actions
const generateNextBestActions = async (
  lead: any,
  signals: BuyingSignal[],
  objections: ObjectionAnalysis[],
  personality: PersonalityProfile
): Promise<NextAction[]> => {
  const actions: NextAction[] = [];
  
  // High-priority actions based on buying signals
  if (signals.some(s => s.type === 'timeline_urgency')) {
    actions.push({
      action: 'Schedule immediate phone consultation',
      priority: 10,
      timeframe: 'within 2 hours',
      expectedOutcome: 'Advance to next stage',
      successProbability: 85,
      requiredResources: ['phone time', 'inventory details']
    });
  }

  if (signals.some(s => s.type === 'budget_mentioned')) {
    actions.push({
      action: 'Present financing options',
      priority: 8,
      timeframe: 'within 24 hours',
      expectedOutcome: 'Address affordability concerns',
      successProbability: 75,
      requiredResources: ['financing calculator', 'payment options']
    });
  }

  // Address objections
  objections.forEach(objection => {
    actions.push({
      action: `Address ${objection.type} objection`,
      priority: objection.severity,
      timeframe: 'next message',
      expectedOutcome: 'Overcome resistance',
      successProbability: objection.successProbability,
      requiredResources: ['objection handling script']
    });
  });

  return actions.sort((a, b) => b.priority - a.priority);
};

// Analyze competitive threats
const analyzeCompetitiveThreats = async (text: string): Promise<CompetitiveThreat[]> => {
  const threats: CompetitiveThreat[] = [];
  
  const competitors = ['toyota', 'honda', 'ford', 'nissan', 'hyundai', 'kia'];
  
  competitors.forEach(competitor => {
    if (text.includes(competitor)) {
      threats.push({
        competitor: competitor.charAt(0).toUpperCase() + competitor.slice(1),
        threatLevel: 7,
        advantagePoints: ['better warranty', 'superior service', 'local presence'],
        vulnerabilities: ['price', 'availability', 'features'],
        counterStrategy: `Emphasize our advantages over ${competitor}`
      });
    }
  });

  return threats;
};

// Assess price sensitivity
const assessPriceSensitivity = async (text: string, lead: any): Promise<PriceSensitivity> => {
  let level: 'low' | 'moderate' | 'high' | 'extreme' = 'moderate';
  
  if (text.includes('expensive') || text.includes('budget') || text.includes('afford')) {
    level = 'high';
  } else if (text.includes('luxury') || text.includes('premium') || text.includes('loaded')) {
    level = 'low';
  }

  return {
    level,
    priceRange: { min: 20000, max: 50000 }, // Based on vehicle interest
    negotiationPotential: level === 'high' ? 80 : 40,
    valueDrivers: ['reliability', 'fuel economy', 'warranty'],
    priceObjections: level === 'high' ? ['total cost', 'monthly payment'] : []
  };
};

// Analyze decision maker status
const analyzeDecisionMaker = async (text: string, conversations: any[]): Promise<DecisionMakerAnalysis> => {
  const hasSpouseReferences = text.includes('wife') || text.includes('husband') || text.includes('spouse');
  const hasBusinessReferences = text.includes('business') || text.includes('company') || text.includes('boss');
  
  return {
    isPrimaryDecisionMaker: !hasSpouseReferences && !hasBusinessReferences,
    influenceLevel: hasSpouseReferences ? 6 : hasBusinessReferences ? 4 : 9,
    otherStakeholders: hasSpouseReferences ? ['spouse'] : hasBusinessReferences ? ['business decision makers'] : [],
    decisionProcess: hasSpouseReferences ? 'family' : hasBusinessReferences ? 'business' : 'individual',
    approvalRequired: hasSpouseReferences || hasBusinessReferences
  };
};

// Build communication profile
const buildCommunicationProfile = async (conversations: any[]): Promise<CommunicationProfile> => {
  const avgLength = conversations
    .filter(c => c.direction === 'in')
    .reduce((sum, c) => sum + c.body.length, 0) / conversations.length || 0;

  return {
    preferredTime: 'business hours', // Could analyze message timestamps
    responsePatterns: 'quick responder',
    messageLength: avgLength < 50 ? 'short' : avgLength < 150 ? 'medium' : 'long',
    formalityLevel: 'professional',
    technicalDetail: 'moderate'
  };
};

// Calculate overall intelligence score
const calculateIntelligenceScore = (
  signals: BuyingSignal[],
  objections: ObjectionAnalysis[],
  personality: PersonalityProfile,
  decisionMaker: DecisionMakerAnalysis
): number => {
  let score = 50; // Base score
  
  // Add points for buying signals
  signals.forEach(signal => {
    score += signal.strength * signal.confidence / 100;
  });
  
  // Subtract points for objections
  objections.forEach(objection => {
    score -= objection.severity * 2;
  });
  
  // Add points for decision maker authority
  score += decisionMaker.influenceLevel * 2;
  
  return Math.max(0, Math.min(100, Math.round(score)));
};

// Calculate buying probability
const calculateBuyingProbability = (
  signals: BuyingSignal[],
  objections: ObjectionAnalysis[],
  personality: PersonalityProfile,
  priceSettings: PriceSensitivity
): number => {
  let probability = 30; // Base probability
  
  // Add for strong buying signals
  signals.forEach(signal => {
    if (signal.type === 'timeline_urgency') probability += 25;
    if (signal.type === 'budget_mentioned') probability += 20;
    if (signal.type === 'feature_interest') probability += 15;
  });
  
  // Reduce for objections
  objections.forEach(objection => {
    probability -= objection.severity * 3;
  });
  
  // Adjust for price sensitivity
  if (priceSettings.level === 'extreme') probability -= 20;
  else if (priceSettings.level === 'high') probability -= 10;
  else if (priceSettings.level === 'low') probability += 10;
  
  return Math.max(0, Math.min(100, Math.round(probability)));
};

// Determine urgency level
const determineUrgencyLevel = (signals: BuyingSignal[], text: string): 'low' | 'medium' | 'high' | 'critical' => {
  const urgentKeywords = ['asap', 'urgent', 'immediately', 'this week', 'need now'];
  const urgentSignals = signals.filter(s => s.type === 'timeline_urgency');
  
  if (urgentSignals.length > 0 || urgentKeywords.some(keyword => text.includes(keyword))) {
    return 'critical';
  } else if (signals.length > 3) {
    return 'high';
  } else if (signals.length > 1) {
    return 'medium';
  }
  
  return 'low';
};

// Generate smart coaching suggestions
export const generateSmartCoachingSuggestions = async (leadId: string): Promise<SmartCoachingSuggestion[]> => {
  try {
    const analysis = await analyzeConversationIntelligence(leadId);
    const suggestions: SmartCoachingSuggestion[] = [];
    
    // Generate suggestions based on analysis
    if (analysis.urgencyLevel === 'critical') {
      suggestions.push({
        id: 'urgent-followup',
        type: 'timing_optimization',
        priority: 'critical',
        title: 'Immediate Action Required',
        description: 'This lead shows critical urgency signals',
        suggestedAction: 'Call within the next hour',
        expectedImpact: 'High probability of conversion',
        riskLevel: 'high',
        confidenceScore: 95,
        timeframe: 'immediate'
      });
    }
    
    if (analysis.buyingProbability > 70) {
      suggestions.push({
        id: 'closing-opportunity',
        type: 'closing_opportunity',
        priority: 'high',
        title: 'Strong Closing Opportunity',
        description: 'Lead shows high buying probability',
        suggestedAction: 'Present final offer with incentives',
        expectedImpact: 'Potential immediate close',
        riskLevel: 'low',
        confidenceScore: 85,
        timeframe: 'today'
      });
    }
    
    // Add objection handling suggestions
    analysis.objections.forEach(objection => {
      suggestions.push({
        id: `objection-${objection.type}`,
        type: 'objection_handling',
        priority: objection.severity > 7 ? 'high' : 'medium',
        title: `Address ${objection.type} objection`,
        description: objection.objection,
        suggestedAction: objection.suggestedResponse,
        expectedImpact: `Increase conversion by ${objection.successProbability}%`,
        riskLevel: 'medium',
        confidenceScore: objection.successProbability,
        timeframe: 'next interaction'
      });
    });
    
    return suggestions.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  } catch (error) {
    console.error('Error generating coaching suggestions:', error);
    return [];
  }
};

// Get market intelligence
export const getMarketIntelligence = async (): Promise<MarketIntelligence> => {
  try {
    // This would typically integrate with external market data APIs
    // For now, we'll simulate market intelligence
    
    const { data: recentLeads } = await supabase
      .from('leads')
      .select('*')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(100);
    
    const leadVolume = recentLeads?.length || 0;
    
    return {
      marketConditions: leadVolume > 50 ? 'hot' : leadVolume > 25 ? 'warm' : 'cool',
      inventoryDemand: Math.min(10, leadVolume / 5),
      pricePosition: 'competitive',
      seasonalFactors: ['Spring buying season', 'Tax refund period'],
      competitorActivity: ['Increased advertising', 'New model launches'],
      marketOpportunities: ['First-time buyers', 'Trade-in upgrades']
    };
  } catch (error) {
    console.error('Error getting market intelligence:', error);
    return {
      marketConditions: 'warm',
      inventoryDemand: 5,
      pricePosition: 'competitive',
      seasonalFactors: [],
      competitorActivity: [],
      marketOpportunities: []
    };
  }
};