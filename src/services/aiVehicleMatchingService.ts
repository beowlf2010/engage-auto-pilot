
import { supabase } from '@/integrations/supabase/client';
import { findMatchingInventory } from './inventoryService';

export interface VehicleMatch {
  inventoryId: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  price: number;
  matchScore: number;
  matchReasons: string[];
  confidence: number;
  aiRecommendation: string;
}

export interface LeadProfile {
  id: string;
  explicitPreferences: {
    vehicleInterest: string;
    priceRange?: { min?: number; max?: number };
    yearRange?: { min?: number; max?: number };
    bodyStyle?: string;
    features?: string[];
  };
  conversationInsights: {
    budgetConcerns: boolean;
    urgency: 'low' | 'medium' | 'high';
    familySize?: number;
    useCase?: string;
    mentionedFeatures: string[];
    priceFlexibility: number; // 0-1 scale
  };
  behavioralSignals: {
    responseTime: number;
    engagementLevel: number;
    priceInquiries: number;
    featureQuestions: number;
  };
}

export const analyzeLeadConversations = async (leadId: string): Promise<LeadProfile['conversationInsights']> => {
  try {
    // Get conversation history
    const { data: conversations } = await supabase
      .from('conversations')
      .select('body, direction, sent_at')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: true });

    if (!conversations || conversations.length === 0) {
      return {
        budgetConcerns: false,
        urgency: 'low',
        mentionedFeatures: [],
        priceFlexibility: 0.5
      };
    }

    const leadMessages = conversations.filter(c => c.direction === 'in').map(c => c.body.toLowerCase());
    const allText = leadMessages.join(' ');

    // Analyze budget concerns
    const budgetKeywords = ['budget', 'afford', 'cheap', 'expensive', 'cost', 'payment', 'financing'];
    const budgetConcerns = budgetKeywords.some(keyword => allText.includes(keyword));

    // Analyze urgency
    const urgencyHigh = ['need soon', 'asap', 'urgent', 'this week', 'immediately'];
    const urgencyMed = ['next month', 'soon', 'looking to buy', 'ready'];
    let urgency: 'low' | 'medium' | 'high' = 'low';
    
    if (urgencyHigh.some(phrase => allText.includes(phrase))) {
      urgency = 'high';
    } else if (urgencyMed.some(phrase => allText.includes(phrase))) {
      urgency = 'medium';
    }

    // Extract mentioned features
    const featureKeywords = [
      'sunroof', 'leather', 'navigation', 'backup camera', 'heated seats',
      'awd', '4wd', 'automatic', 'manual', 'hybrid', 'electric',
      'bluetooth', 'apple carplay', 'android auto', 'cruise control'
    ];
    const mentionedFeatures = featureKeywords.filter(feature => allText.includes(feature));

    // Analyze family indicators
    const familyKeywords = ['family', 'kids', 'children', 'car seats', 'space', 'room'];
    const familySize = familyKeywords.some(keyword => allText.includes(keyword)) ? 4 : 2;

    // Determine use case
    let useCase = 'daily driving';
    if (allText.includes('work') || allText.includes('commut')) useCase = 'commuting';
    if (allText.includes('family') || allText.includes('kids')) useCase = 'family';
    if (allText.includes('weekend') || allText.includes('recreation')) useCase = 'recreation';

    // Calculate price flexibility based on conversation tone
    const flexibilityIndicators = ['flexible', 'negotiate', 'work with', 'best price'];
    const rigidIndicators = ['must be under', 'cannot exceed', 'strict budget'];
    let priceFlexibility = 0.5;
    
    if (flexibilityIndicators.some(phrase => allText.includes(phrase))) {
      priceFlexibility = 0.8;
    } else if (rigidIndicators.some(phrase => allText.includes(phrase))) {
      priceFlexibility = 0.2;
    }

    return {
      budgetConcerns,
      urgency,
      familySize,
      useCase,
      mentionedFeatures,
      priceFlexibility
    };
  } catch (error) {
    console.error('Error analyzing conversations:', error);
    return {
      budgetConcerns: false,
      urgency: 'low',
      mentionedFeatures: [],
      priceFlexibility: 0.5
    };
  }
};

export const calculateBehavioralSignals = async (leadId: string): Promise<LeadProfile['behavioralSignals']> => {
  try {
    const { data: conversations } = await supabase
      .from('conversations')
      .select('body, direction, sent_at')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: true });

    if (!conversations || conversations.length === 0) {
      return {
        responseTime: 24,
        engagementLevel: 0.1,
        priceInquiries: 0,
        featureQuestions: 0
      };
    }

    // Calculate average response time
    const responses = conversations.filter(c => c.direction === 'in');
    const outgoing = conversations.filter(c => c.direction === 'out');
    
    let totalResponseTime = 0;
    let responseCount = 0;
    
    for (const response of responses) {
      const lastOutgoing = outgoing
        .filter(o => new Date(o.sent_at) < new Date(response.sent_at))
        .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0];
      
      if (lastOutgoing) {
        const timeDiff = new Date(response.sent_at).getTime() - new Date(lastOutgoing.sent_at).getTime();
        totalResponseTime += timeDiff / (1000 * 60 * 60); // Convert to hours
        responseCount++;
      }
    }

    const avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 24;

    // Calculate engagement level (0-1 based on message length and frequency)
    const avgMessageLength = responses.reduce((sum, r) => sum + r.body.length, 0) / responses.length;
    const messageFrequency = responses.length / Math.max(1, conversations.length);
    const engagementLevel = Math.min(1, (avgMessageLength / 100) * messageFrequency);

    // Count price and feature inquiries
    const allResponseText = responses.map(r => r.body.toLowerCase()).join(' ');
    const priceWords = ['price', 'cost', 'payment', 'financing', 'lease', '$'];
    const featureWords = ['feature', 'option', 'equipment', 'includes', 'comes with'];
    
    const priceInquiries = priceWords.reduce((count, word) => 
      count + (allResponseText.match(new RegExp(word, 'g')) || []).length, 0
    );
    
    const featureQuestions = featureWords.reduce((count, word) => 
      count + (allResponseText.match(new RegExp(word, 'g')) || []).length, 0
    );

    return {
      responseTime: avgResponseTime,
      engagementLevel,
      priceInquiries,
      featureQuestions
    };
  } catch (error) {
    console.error('Error calculating behavioral signals:', error);
    return {
      responseTime: 24,
      engagementLevel: 0.1,
      priceInquiries: 0,
      featureQuestions: 0
    };
  }
};

export const generateAIRecommendations = async (leadId: string): Promise<VehicleMatch[]> => {
  try {
    // Get lead data
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (!lead) throw new Error('Lead not found');

    // Build lead profile
    const conversationInsights = await analyzeLeadConversations(leadId);
    const behavioralSignals = await calculateBehavioralSignals(leadId);

    const leadProfile: LeadProfile = {
      id: leadId,
      explicitPreferences: {
        vehicleInterest: lead.vehicle_interest,
        priceRange: {
          min: lead.preferred_price_min,
          max: lead.preferred_price_max
        },
        yearRange: {
          min: lead.preferred_year_min,
          max: lead.preferred_year_max
        }
      },
      conversationInsights,
      behavioralSignals
    };

    // Get base inventory matches
    const baseMatches = await findMatchingInventory(leadId);

    // Enhanced AI scoring
    const vehicleMatches: VehicleMatch[] = baseMatches.map(vehicle => {
      const matchReasons: string[] = [];
      let matchScore = 0;
      let confidence = 0.5;

      // Base make/model match
      if (leadProfile.explicitPreferences.vehicleInterest.toLowerCase().includes(vehicle.make.toLowerCase())) {
        matchScore += 25;
        matchReasons.push(`Matches preferred make: ${vehicle.make}`);
      }
      
      if (leadProfile.explicitPreferences.vehicleInterest.toLowerCase().includes(vehicle.model.toLowerCase())) {
        matchScore += 25;
        matchReasons.push(`Matches preferred model: ${vehicle.model}`);
      }

      // Price alignment with flexibility consideration
      const priceRange = leadProfile.explicitPreferences.priceRange;
      if (priceRange.min && vehicle.price >= priceRange.min) {
        matchScore += 10;
      }
      if (priceRange.max) {
        const flexibleMax = priceRange.max * (1 + leadProfile.conversationInsights.priceFlexibility * 0.2);
        if (vehicle.price <= flexibleMax) {
          matchScore += 15;
          if (vehicle.price <= priceRange.max) {
            matchReasons.push(`Within stated budget of $${priceRange.max.toLocaleString()}`);
          } else {
            matchReasons.push(`Close to budget (considering flexibility)`);
          }
        }
      }

      // Year preferences
      const yearRange = leadProfile.explicitPreferences.yearRange;
      if (yearRange.min && vehicle.year >= yearRange.min) {
        matchScore += 5;
      }
      if (yearRange.max && vehicle.year <= yearRange.max) {
        matchScore += 5;
      }

      // Urgency bonus (newer vehicles for urgent buyers)
      if (leadProfile.conversationInsights.urgency === 'high' && vehicle.year >= new Date().getFullYear() - 2) {
        matchScore += 10;
        matchReasons.push(`Recent model year for urgent buyer`);
      }

      // Family considerations
      if (leadProfile.conversationInsights.familySize && leadProfile.conversationInsights.familySize > 2) {
        const familyFriendlyModels = ['suv', 'crossover', 'minivan', 'wagon', 'crew cab'];
        if (familyFriendlyModels.some(type => 
          vehicle.model.toLowerCase().includes(type) || 
          (vehicle.trim && vehicle.trim.toLowerCase().includes(type))
        )) {
          matchScore += 15;
          matchReasons.push(`Family-friendly vehicle for household needs`);
        }
      }

      // Budget consciousness
      if (leadProfile.conversationInsights.budgetConcerns) {
        const avgPrice = baseMatches.reduce((sum, v) => sum + v.price, 0) / baseMatches.length;
        if (vehicle.price < avgPrice) {
          matchScore += 10;
          matchReasons.push(`Budget-conscious option`);
        }
      }

      // Engagement level bonus
      if (leadProfile.behavioralSignals.engagementLevel > 0.7) {
        matchScore += 5;
        confidence += 0.2;
      }

      // Response time factor (quick responders get priority vehicles)
      if (leadProfile.behavioralSignals.responseTime < 4) {
        matchScore += 5;
        confidence += 0.1;
      }

      // Generate AI recommendation text
      let aiRecommendation = `This ${vehicle.year} ${vehicle.make} ${vehicle.model}`;
      
      if (matchReasons.length > 0) {
        aiRecommendation += ` is recommended because it ${matchReasons[0].toLowerCase()}`;
        if (matchReasons.length > 1) {
          aiRecommendation += ` and ${matchReasons.slice(1, 3).map(r => r.toLowerCase()).join(', ')}`;
        }
      }

      if (leadProfile.conversationInsights.urgency === 'high') {
        aiRecommendation += `. Given your timeline, this vehicle is immediately available.`;
      }

      return {
        inventoryId: vehicle.inventory_id,
        vin: vehicle.vin,
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        trim: vehicle.trim,
        price: vehicle.price,
        matchScore: Math.min(100, matchScore),
        matchReasons,
        confidence: Math.min(1, confidence),
        aiRecommendation
      };
    });

    // Sort by match score and return top matches
    return vehicleMatches
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);

  } catch (error) {
    console.error('Error generating AI recommendations:', error);
    return [];
  }
};

export const getPersonalizedInventory = async (leadId: string) => {
  const recommendations = await generateAIRecommendations(leadId);
  const conversationInsights = await analyzeLeadConversations(leadId);
  
  return {
    recommendations,
    insights: conversationInsights,
    totalMatches: recommendations.length
  };
};
