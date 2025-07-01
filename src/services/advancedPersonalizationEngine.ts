import { supabase } from '@/integrations/supabase/client';

interface PersonalizationProfile {
  communicationStyle: 'formal' | 'casual' | 'technical' | 'friendly';
  preferredTone: 'professional' | 'conversational' | 'enthusiastic' | 'direct';
  responseLength: 'brief' | 'moderate' | 'detailed';
  personalityType: 'analytical' | 'driver' | 'expressive' | 'amiable';
  engagementPreferences: string[];
  vehiclePreferences: {
    priceRange?: string;
    bodyStyle?: string;
    features?: string[];
    urgencyLevel?: 'low' | 'medium' | 'high';
  };
  responsePatterns: {
    averageResponseTime: number;
    preferredContactHours: number[];
    questioningStyle: string;
  };
  emotionalProfile: {
    primaryEmotions: string[];
    stressIndicators: string[];
    motivationFactors: string[];
  };
}

interface PersonalizationContext {
  customerMessage: string;
  conversationHistory: string[];
  vehicleInterest: string;
  leadData?: any;
}

interface PersonalizedResponse {
  message: string;
  confidence: number;
  personalizationFactors: string[];
  reasoning: string[];
}

// Helper function to safely parse JSON data
function safeJsonParse<T>(data: any, fallback: T): T {
  if (!data) return fallback;
  if (typeof data === 'object') return data as T;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

// Helper function to check if an object has a property
function hasProperty<T extends Record<string, any>>(obj: any, prop: string): obj is T {
  return obj && typeof obj === 'object' && prop in obj;
}

class AdvancedPersonalizationEngineService {
  private profileCache = new Map<string, PersonalizationProfile>();

  async getPersonalizationProfile(leadId: string): Promise<PersonalizationProfile> {
    try {
      // Check cache first
      if (this.profileCache.has(leadId)) {
        return this.profileCache.get(leadId)!;
      }

      console.log('🎭 [PERSONALIZATION] Getting personalization profile for:', leadId);

      // Get existing profile from AI conversation context
      const { data: contextData } = await supabase
        .from('ai_conversation_context')
        .select('lead_preferences, response_style, key_topics')
        .eq('lead_id', leadId)
        .single();

      const defaultProfile: PersonalizationProfile = {
        communicationStyle: 'casual',
        preferredTone: 'conversational',
        responseLength: 'moderate',
        personalityType: 'amiable',
        engagementPreferences: ['direct_questions', 'helpful_information'],
        vehiclePreferences: {
          urgencyLevel: 'medium'
        },
        responsePatterns: {
          averageResponseTime: 120,
          preferredContactHours: [9, 10, 11, 14, 15, 16, 17, 18],
          questioningStyle: 'consultative'
        },
        emotionalProfile: {
          primaryEmotions: ['curious', 'hopeful'],
          stressIndicators: ['time_pressure', 'budget_concerns'],
          motivationFactors: ['value', 'reliability', 'family_needs']
        }
      };

      if (contextData?.lead_preferences) {
        const preferences = safeJsonParse(contextData.lead_preferences, {});
        
        // Safely extract properties with type checking
        const profile: PersonalizationProfile = {
          communicationStyle: hasProperty(preferences, 'communicationStyle') ? 
            preferences.communicationStyle as PersonalizationProfile['communicationStyle'] : 
            defaultProfile.communicationStyle,
          preferredTone: hasProperty(preferences, 'preferredTone') ? 
            preferences.preferredTone as PersonalizationProfile['preferredTone'] : 
            defaultProfile.preferredTone,
          responseLength: hasProperty(preferences, 'responseLength') ? 
            preferences.responseLength as PersonalizationProfile['responseLength'] : 
            defaultProfile.responseLength,
          personalityType: hasProperty(preferences, 'personalityType') ? 
            preferences.personalityType as PersonalizationProfile['personalityType'] : 
            defaultProfile.personalityType,
          engagementPreferences: defaultProfile.engagementPreferences,
          vehiclePreferences: hasProperty(preferences, 'vehiclePreferences') ? 
            preferences.vehiclePreferences as PersonalizationProfile['vehiclePreferences'] : 
            defaultProfile.vehiclePreferences,
          responsePatterns: defaultProfile.responsePatterns,
          emotionalProfile: defaultProfile.emotionalProfile
        };

        this.profileCache.set(leadId, profile);
        return profile;
      }

      // Cache and return default profile
      this.profileCache.set(leadId, defaultProfile);
      return defaultProfile;

    } catch (error) {
      console.error('❌ [PERSONALIZATION] Error getting profile:', error);
      
      const fallbackProfile: PersonalizationProfile = {
        communicationStyle: 'casual',
        preferredTone: 'conversational',
        responseLength: 'moderate',
        personalityType: 'amiable',
        engagementPreferences: ['helpful_information'],
        vehiclePreferences: { urgencyLevel: 'medium' },
        responsePatterns: {
          averageResponseTime: 120,
          preferredContactHours: [9, 14, 18],
          questioningStyle: 'consultative'
        },
        emotionalProfile: {
          primaryEmotions: ['curious'],
          stressIndicators: ['budget_concerns'],
          motivationFactors: ['value', 'reliability']
        }
      };
      
      return fallbackProfile;
    }
  }

  async generatePersonalizedResponse(
    leadId: string,
    baseMessage: string,
    context: PersonalizationContext
  ): Promise<PersonalizedResponse> {
    try {
      console.log('🎭 [PERSONALIZATION] Generating personalized response for:', leadId);

      const profile = await this.getPersonalizationProfile(leadId);
      const behaviorAnalysis = this.analyzeCustomerBehavior(context.conversationHistory);
      const emotionalState = this.detectEmotionalState(context.customerMessage);

      // Apply personalization layers
      let personalizedMessage = baseMessage;
      const appliedFactors: string[] = [];
      const reasoning: string[] = [];

      // 1. Communication Style Adaptation
      if (profile.communicationStyle === 'formal') {
        personalizedMessage = this.applyFormalTone(personalizedMessage);
        appliedFactors.push('formal_communication');
        reasoning.push('Adapted to formal communication style preference');
      } else if (profile.communicationStyle === 'technical') {
        personalizedMessage = this.addTechnicalDetails(personalizedMessage);
        appliedFactors.push('technical_details');
        reasoning.push('Added technical details for analytically-minded customer');
      }

      // 2. Response Length Adjustment
      if (profile.responseLength === 'brief') {
        personalizedMessage = this.condenseMessage(personalizedMessage);
        appliedFactors.push('concise_response');
        reasoning.push('Condensed response for customer who prefers brief communication');
      } else if (profile.responseLength === 'detailed') {
        personalizedMessage = this.expandMessage(personalizedMessage, context);
        appliedFactors.push('detailed_response');
        reasoning.push('Expanded response with additional helpful details');
      }

      // 3. Emotional Adaptation
      if (emotionalState.includes('frustrated')) {
        personalizedMessage = this.applyEmpathyLayer(personalizedMessage);
        appliedFactors.push('empathy_layer');
        reasoning.push('Added empathetic tone to address customer frustration');
      } else if (emotionalState.includes('excited')) {
        personalizedMessage = this.matchEnthusiasm(personalizedMessage);
        appliedFactors.push('enthusiasm_matching');
        reasoning.push('Matched customer enthusiasm level');
      }

      // 4. Vehicle Preference Integration
      if (profile.vehiclePreferences.urgencyLevel === 'high') {
        personalizedMessage = this.addUrgencyElements(personalizedMessage);
        appliedFactors.push('urgency_awareness');
        reasoning.push('Acknowledged high urgency level in vehicle search');
      }

      // Calculate confidence based on available data
      const confidence = Math.min(0.95, 0.6 + (appliedFactors.length * 0.1));

      const response: PersonalizedResponse = {
        message: personalizedMessage,
        confidence,
        personalizationFactors: appliedFactors,
        reasoning
      };

      console.log('✅ [PERSONALIZATION] Generated personalized response:', {
        factors: appliedFactors.length,
        confidence: Math.round(confidence * 100) + '%'
      });

      return response;

    } catch (error) {
      console.error('❌ [PERSONALIZATION] Error generating personalized response:', error);
      
      return {
        message: baseMessage,
        confidence: 0.5,
        personalizationFactors: ['fallback'],
        reasoning: ['Used fallback due to personalization error']
      };
    }
  }

  private analyzeCustomerBehavior(conversationHistory: string[]): any {
    // Analyze patterns in conversation history
    const recentMessages = conversationHistory.slice(-5);
    
    return {
      questionFrequency: recentMessages.filter(msg => msg.includes('?')).length,
      averageMessageLength: recentMessages.reduce((sum, msg) => sum + msg.length, 0) / recentMessages.length,
      urgencyIndicators: recentMessages.some(msg => 
        msg.toLowerCase().includes('soon') || 
        msg.toLowerCase().includes('urgent') ||
        msg.toLowerCase().includes('asap')
      )
    };
  }

  private detectEmotionalState(message: string): string[] {
    const emotions: string[] = [];
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('frustrated') || lowerMessage.includes('annoyed')) {
      emotions.push('frustrated');
    }
    if (lowerMessage.includes('excited') || lowerMessage.includes('love')) {
      emotions.push('excited');
    }
    if (lowerMessage.includes('worried') || lowerMessage.includes('concerned')) {
      emotions.push('anxious');
    }
    
    return emotions.length > 0 ? emotions : ['neutral'];
  }

  private applyFormalTone(message: string): string {
    return message
      .replace(/Hi!/g, 'Good day,')
      .replace(/Thanks!/g, 'Thank you for your inquiry.')
      .replace(/Let me know/g, 'Please feel free to contact me');
  }

  private addTechnicalDetails(message: string): string {
    // Add technical specifications where relevant
    if (message.includes('vehicle') || message.includes('car')) {
      return message + ' I can provide detailed specifications, performance metrics, and technical comparisons if that would be helpful.';
    }
    return message;
  }

  private condenseMessage(message: string): string {
    // Remove filler words and make more concise
    return message
      .replace(/I'd be happy to help you with/g, 'I can help with')
      .replace(/Please don't hesitate to/g, 'Please')
      .replace(/Feel free to/g, 'You can');
  }

  private expandMessage(message: string, context: PersonalizationContext): string {
    // Add more context and helpful information
    let expanded = message;
    
    if (context.vehicleInterest) {
      expanded += ` Based on your interest in ${context.vehicleInterest}, I can also share information about similar models, current incentives, and availability.`;
    }
    
    return expanded;
  }

  private applyEmpathyLayer(message: string): string {
    return `I understand this process can be overwhelming. ${message} I'm here to make this as smooth as possible for you.`;
  }

  private matchEnthusiasm(message: string): string {
    return message.replace(/\./g, '!').replace(/good/g, 'great').replace(/help/g, 'absolutely help');
  }

  private addUrgencyElements(message: string): string {
    return message + ' Given your timeline, I\'ll prioritize getting you the information you need quickly.';
  }

  async updatePersonalizationProfile(
    leadId: string, 
    updates: { 
      responseReceived?: boolean;
      engagementType?: string;
      satisfactionLevel?: number;
    }
  ): Promise<void> {
    try {
      console.log('🎭 [PERSONALIZATION] Updating profile for:', leadId);

      // Store learning outcome for this personalization attempt
      await supabase
        .from('ai_learning_outcomes')
        .insert({
          lead_id: leadId,
          outcome_type: 'personalization_feedback',
          message_characteristics: JSON.stringify({
            personalization_factors: this.profileCache.get(leadId) || {},
            feedback: updates
          }),
          conversation_quality_score: updates.satisfactionLevel || 0.5
        });

      // Update cached profile based on feedback
      if (this.profileCache.has(leadId)) {
        const profile = this.profileCache.get(leadId)!;
        
        // Adjust communication style based on engagement
        if (updates.engagementType === 'positive_detailed_response') {
          profile.responseLength = 'detailed';
        } else if (updates.engagementType === 'quick_acknowledgment') {
          profile.responseLength = 'brief';
        }

        this.profileCache.set(leadId, profile);
      }

      console.log('✅ [PERSONALIZATION] Profile updated successfully');

    } catch (error) {
      console.error('❌ [PERSONALIZATION] Error updating profile:', error);
    }
  }

  async getPersonalizationInsights(): Promise<any> {
    try {
      // Get insights from recent learning outcomes
      const { data: learningData } = await supabase
        .from('ai_learning_outcomes')
        .select('*')
        .eq('outcome_type', 'personalization_feedback')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(100);

      const insights = {
        total_personalizations: learningData?.length || 0,
        success_rate: 0.8, // Calculated from feedback
        top_factors: ['communication_style', 'response_length', 'emotional_adaptation'],
        improvement_areas: ['technical_details', 'urgency_detection']
      };

      // Safely process learning data
      if (learningData && learningData.length > 0) {
        const successfulPersonalizations = learningData.filter(outcome => {
          const characteristics = safeJsonParse(outcome.message_characteristics, {});
          const feedback = hasProperty(characteristics, 'feedback') ? characteristics.feedback : {};
          return hasProperty(feedback, 'satisfactionLevel') && feedback.satisfactionLevel > 0.6;
        });

        insights.success_rate = successfulPersonalizations.length / learningData.length;
      }

      return insights;

    } catch (error) {
      console.error('❌ [PERSONALIZATION] Error getting insights:', error);
      return {
        total_personalizations: 0,
        success_rate: 0.5,
        top_factors: [],
        improvement_areas: ['data_collection']
      };
    }
  }

  async analyzePersonalizationOpportunities(leadId: string): Promise<string[]> {
    try {
      const profile = await this.getPersonalizationProfile(leadId);
      const opportunities: string[] = [];

      // Analyze conversation context for improvement opportunities
      const { data: contextData } = await supabase
        .from('ai_conversation_context')
        .select('*')
        .eq('lead_id', leadId)
        .single();

      if (contextData) {
        const preferences = safeJsonParse(contextData.lead_preferences, {});
        
        if (!hasProperty(preferences, 'communicationStyle')) {
          opportunities.push('communication_style_detection');
        }
        
        if (!hasProperty(preferences, 'vehiclePreferences')) {
          opportunities.push('vehicle_preference_learning');
        }
      }

      return opportunities;

    } catch (error) {
      console.error('❌ [PERSONALIZATION] Error analyzing opportunities:', error);
      return ['data_collection', 'behavioral_analysis'];
    }
  }
}

export const advancedPersonalizationEngine = new AdvancedPersonalizationEngineService();
