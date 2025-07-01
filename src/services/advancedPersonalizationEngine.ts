import { supabase } from '@/integrations/supabase/client';

interface PersonalizationProfile {
  communicationStyle: string;
  preferredTone: string;
  responseLength: string;
  personalityType: string;
  buyingStage: string;
  priceRange?: { min: number; max: number };
  vehiclePreferences: string[];
  urgencyLevel: number;
  lastUpdated: Date;
}

interface PersonalizationContext {
  customerMessage: string;
  conversationHistory: string[];
  vehicleInterest?: string;
  previousResponses?: string[];
}

interface PersonalizedResponse {
  message: string;
  confidence: number;
  personalizationFactors: string[];
  styleAdjustments: string[];
}

class AdvancedPersonalizationEngineService {
  private profileCache = new Map<string, PersonalizationProfile>();

  async generatePersonalizedResponse(
    leadId: string,
    baseMessage: string,
    context: PersonalizationContext
  ): Promise<PersonalizedResponse> {
    try {
      console.log('🎯 [PERSONALIZATION] Generating personalized response for lead:', leadId);

      // Get or create personalization profile
      const profile = await this.getPersonalizationProfile(leadId);
      
      // Apply personalization layers
      let personalizedMessage = await this.applyPersonalizationLayers(baseMessage, profile, context);
      
      // Calculate confidence and track factors
      const personalizationFactors = this.getAppliedPersonalizationFactors(profile);
      const confidence = this.calculatePersonalizationConfidence(profile, context);

      const response: PersonalizedResponse = {
        message: personalizedMessage,
        confidence,
        personalizationFactors,
        styleAdjustments: this.getStyleAdjustments(profile)
      };

      // Track personalization usage
      await this.trackPersonalizationUsage(leadId, response);

      console.log('✅ [PERSONALIZATION] Generated personalized response with confidence:', Math.round(confidence * 100) + '%');
      return response;

    } catch (error) {
      console.error('❌ [PERSONALIZATION] Error generating personalized response:', error);
      
      // Return minimally personalized response as fallback
      return {
        message: baseMessage,
        confidence: 0.5,
        personalizationFactors: ['fallback'],
        styleAdjustments: []
      };
    }
  }

  private async getPersonalizationProfile(leadId: string): Promise<PersonalizationProfile> {
    // Check cache first
    if (this.profileCache.has(leadId)) {
      return this.profileCache.get(leadId)!;
    }

    try {
      // Get existing profile from conversation context
      const { data: contextData } = await supabase
        .from('ai_conversation_context')
        .select('*')
        .eq('lead_id', leadId)
        .single();

      let profile: PersonalizationProfile;

      if (contextData && contextData.lead_preferences) {
        // Use existing profile
        profile = {
          communicationStyle: contextData.lead_preferences.communicationStyle || 'professional',
          preferredTone: contextData.lead_preferences.preferredTone || 'friendly',
          responseLength: contextData.lead_preferences.responseLength || 'medium',
          personalityType: contextData.lead_preferences.personalityType || 'analytical',
          buyingStage: contextData.response_style || 'research',
          vehiclePreferences: contextData.lead_preferences.vehiclePreferences || [],
          urgencyLevel: contextData.context_score || 5,
          lastUpdated: new Date(contextData.updated_at)
        };
      } else {
        // Create new profile with intelligent defaults
        profile = await this.createIntelligentProfile(leadId);
      }

      // Cache the profile
      this.profileCache.set(leadId, profile);
      return profile;

    } catch (error) {
      console.error('❌ [PERSONALIZATION] Error getting profile:', error);
      
      // Return default profile
      return {
        communicationStyle: 'professional',
        preferredTone: 'friendly',
        responseLength: 'medium',
        personalityType: 'analytical',
        buyingStage: 'research',
        vehiclePreferences: [],
        urgencyLevel: 5,
        lastUpdated: new Date()
      };
    }
  }

  private async createIntelligentProfile(leadId: string): Promise<PersonalizationProfile> {
    try {
      // Analyze recent conversations to infer preferences
      const { data: conversations } = await supabase
        .from('conversations')
        .select('body, direction, sent_at')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: false })
        .limit(10);

      const profile: PersonalizationProfile = {
        communicationStyle: this.inferCommunicationStyle(conversations || []),
        preferredTone: this.inferPreferredTone(conversations || []),
        responseLength: this.inferResponseLength(conversations || []),
        personalityType: this.inferPersonalityType(conversations || []),
        buyingStage: this.inferBuyingStage(conversations || []),
        vehiclePreferences: this.inferVehiclePreferences(conversations || []),
        urgencyLevel: this.inferUrgencyLevel(conversations || []),
        lastUpdated: new Date()
      };

      // Save initial profile
      await this.saveProfileToContext(leadId, profile);
      
      return profile;

    } catch (error) {
      console.error('❌ [PERSONALIZATION] Error creating intelligent profile:', error);
      throw error;
    }
  }

  private inferCommunicationStyle(conversations: any[]): string {
    const customerMessages = conversations.filter(c => c.direction === 'in');
    
    if (customerMessages.length === 0) return 'professional';
    
    const avgLength = customerMessages.reduce((sum, msg) => sum + msg.body.length, 0) / customerMessages.length;
    const hasSlang = customerMessages.some(msg => /\b(hey|yeah|gonna|wanna)\b/i.test(msg.body));
    
    if (avgLength < 50 && hasSlang) return 'casual';
    if (avgLength > 150) return 'detailed';
    
    return 'professional';
  }

  private inferPreferredTone(conversations: any[]): string {
    const customerMessages = conversations.filter(c => c.direction === 'in');
    
    if (customerMessages.length === 0) return 'friendly';
    
    const hasUrgentKeywords = customerMessages.some(msg => 
      /\b(urgent|asap|quickly|soon|now)\b/i.test(msg.body)
    );
    
    const hasPoliteKeywords = customerMessages.some(msg => 
      /\b(please|thank you|appreciate|grateful)\b/i.test(msg.body)
    );
    
    if (hasUrgentKeywords) return 'direct';
    if (hasPoliteKeywords) return 'courteous';
    
    return 'friendly';
  }

  private inferResponseLength(conversations: any[]): string {
    const ourMessages = conversations.filter(c => c.direction === 'out');
    
    if (ourMessages.length === 0) return 'medium';
    
    const avgLength = ourMessages.reduce((sum, msg) => sum + msg.body.length, 0) / ourMessages.length;
    
    if (avgLength < 100) return 'short';
    if (avgLength > 200) return 'detailed';
    
    return 'medium';
  }

  private inferPersonalityType(conversations: any[]): string {
    const customerMessages = conversations.filter(c => c.direction === 'in');
    
    if (customerMessages.length === 0) return 'analytical';
    
    const hasDetailQuestions = customerMessages.some(msg => 
      /\b(spec|detail|feature|option|comparison)\b/i.test(msg.body)
    );
    
    const hasEmotionalWords = customerMessages.some(msg => 
      /\b(love|hate|excited|worried|dream|feel)\b/i.test(msg.body)
    );
    
    if (hasDetailQuestions) return 'analytical';
    if (hasEmotionalWords) return 'emotional';
    
    return 'balanced';
  }

  private inferBuyingStage(conversations: any[]): string {
    const allMessages = conversations.map(c => c.body.toLowerCase()).join(' ');
    
    if (/\b(financing|payment|loan|credit|down payment)\b/.test(allMessages)) return 'financing';
    if (/\b(test drive|visit|appointment|see|look at)\b/.test(allMessages)) return 'consideration';
    if (/\b(buy|purchase|deal|ready|decided)\b/.test(allMessages)) return 'decision';
    
    return 'research';
  }

  private inferVehiclePreferences(conversations: any[]): string[] {
    const allMessages = conversations.map(c => c.body.toLowerCase()).join(' ');
    const preferences: string[] = [];
    
    if (/\b(suv|truck|crossover)\b/.test(allMessages)) preferences.push('SUV/Truck');
    if (/\b(sedan|car)\b/.test(allMessages)) preferences.push('Sedan');
    if (/\b(new|latest|2024|2025)\b/.test(allMessages)) preferences.push('New');
    if (/\b(used|pre-owned|certified)\b/.test(allMessages)) preferences.push('Used');
    if (/\b(fuel|mpg|gas|efficient)\b/.test(allMessages)) preferences.push('Fuel Efficient');
    if (/\b(luxury|premium|loaded)\b/.test(allMessages)) preferences.push('Luxury');
    
    return preferences;
  }

  private inferUrgencyLevel(conversations: any[]): number {
    const allMessages = conversations.map(c => c.body.toLowerCase()).join(' ');
    
    if (/\b(urgent|asap|immediately|today)\b/.test(allMessages)) return 9;
    if (/\b(soon|quickly|this week)\b/.test(allMessages)) return 7;
    if (/\b(looking|interested|considering)\b/.test(allMessages)) return 5;
    if (/\b(maybe|someday|future)\b/.test(allMessages)) return 3;
    
    return 5; // Default medium urgency
  }

  private async saveProfileToContext(leadId: string, profile: PersonalizationProfile): Promise<void> {
    try {
      await supabase
        .from('ai_conversation_context')
        .upsert({
          lead_id: leadId,
          lead_preferences: profile as any,
          response_style: profile.buyingStage,
          context_score: profile.urgencyLevel,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('❌ [PERSONALIZATION] Error saving profile:', error);
    }
  }

  private async applyPersonalizationLayers(
    baseMessage: string,
    profile: PersonalizationProfile,
    context: PersonalizationContext
  ): Promise<string> {
    let message = baseMessage;

    // Layer 1: Communication style adjustment
    message = this.adjustCommunicationStyle(message, profile.communicationStyle);
    
    // Layer 2: Tone adjustment
    message = this.adjustTone(message, profile.preferredTone);
    
    // Layer 3: Length adjustment
    message = this.adjustLength(message, profile.responseLength);
    
    // Layer 4: Personality-based adjustments
    message = this.adjustForPersonality(message, profile.personalityType);
    
    // Layer 5: Buying stage contextual adjustments
    message = this.adjustForBuyingStage(message, profile.buyingStage, context);
    
    return message;
  }

  private adjustCommunicationStyle(message: string, style: string): string {
    switch (style) {
      case 'casual':
        return message
          .replace(/\bI would like to\b/g, "I'd like to")
          .replace(/\bYou are\b/g, "You're")
          .replace(/\bWe have\b/g, "We've got");
      
      case 'detailed':
        // Add more context and explanations
        if (message.includes('available')) {
          return message.replace('available', 'currently available in our inventory');
        }
        return message;
      
      case 'professional':
      default:
        return message;
    }
  }

  private adjustTone(message: string, tone: string): string {
    switch (tone) {
      case 'direct':
        return message
          .replace(/\bI hope\b/g, "I believe")
          .replace(/\bmight be\b/g, "is")
          .replace(/\bcould be\b/g, "would be");
      
      case 'courteous':
        if (!message.includes('please') && !message.includes('thank you')) {
          return message + ' Please let me know if you have any questions.';
        }
        return message;
      
      case 'friendly':
      default:
        return message;
    }
  }

  private adjustLength(message: string, length: string): string {
    switch (length) {
      case 'short':
        // Keep only essential information
        return message.split('.')[0] + '.';
      
      case 'detailed':
        // Add more context if message is too short
        if (message.length < 100) {
          return message + ' I\'d be happy to provide more details about any specific aspects you\'re interested in.';
        }
        return message;
      
      case 'medium':
      default:
        return message;
    }
  }

  private adjustForPersonality(message: string, personality: string): string {
    switch (personality) {
      case 'analytical':
        // Add specific details and features
        return message.replace(/\bgreat\b/g, 'excellent value with competitive features');
      
      case 'emotional':
        // Add emotional language
        return message.replace(/\bavailable\b/g, 'perfect for you');
      
      case 'balanced':
      default:
        return message;
    }
  }

  private adjustForBuyingStage(message: string, stage: string, context: PersonalizationContext): string {
    switch (stage) {
      case 'research':
        // Focus on information and education
        return message + ' I can provide detailed specifications and comparisons if that would be helpful.';
      
      case 'consideration':
        // Focus on scheduling and viewing
        if (!message.includes('test drive') && !message.includes('visit')) {
          return message + ' Would you like to schedule a test drive?';
        }
        return message;
      
      case 'financing':
        // Focus on payment options
        return message + ' I can also discuss financing options that might work for your budget.';
      
      case 'decision':
        // Focus on closing and next steps
        return message + ' I\'m here to help make this process as smooth as possible for you.';
      
      default:
        return message;
    }
  }

  private getAppliedPersonalizationFactors(profile: PersonalizationProfile): string[] {
    const factors: string[] = [];
    
    factors.push(`communication_${profile.communicationStyle}`);
    factors.push(`tone_${profile.preferredTone}`);
    factors.push(`length_${profile.responseLength}`);
    factors.push(`personality_${profile.personalityType}`);
    factors.push(`stage_${profile.buyingStage}`);
    
    if (profile.urgencyLevel > 7) factors.push('high_urgency');
    if (profile.vehiclePreferences.length > 0) factors.push('vehicle_preferences');
    
    return factors;
  }

  private calculatePersonalizationConfidence(profile: PersonalizationProfile, context: PersonalizationContext): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on profile completeness
    if (profile.vehiclePreferences.length > 0) confidence += 0.1;
    if (profile.lastUpdated > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) confidence += 0.1;
    
    // Increase confidence based on context richness
    if (context.conversationHistory.length > 3) confidence += 0.1;
    if (context.vehicleInterest) confidence += 0.1;
    
    // Increase confidence based on profile age (more interactions = better profile)
    const profileAge = Date.now() - profile.lastUpdated.getTime();
    if (profileAge > 24 * 60 * 60 * 1000) confidence += 0.1; // Profile older than 1 day
    
    return Math.min(confidence, 1.0);
  }

  private getStyleAdjustments(profile: PersonalizationProfile): string[] {
    const adjustments: string[] = [];
    
    if (profile.communicationStyle !== 'professional') {
      adjustments.push(`Applied ${profile.communicationStyle} communication style`);
    }
    
    if (profile.preferredTone !== 'friendly') {
      adjustments.push(`Adjusted tone to ${profile.preferredTone}`);
    }
    
    if (profile.responseLength !== 'medium') {
      adjustments.push(`Optimized for ${profile.responseLength} response length`);
    }
    
    return adjustments;
  }

  private async trackPersonalizationUsage(leadId: string, response: PersonalizedResponse): Promise<void> {
    try {
      // Use proper JSON serialization for database storage
      const learningData = {
        personalization_factors: response.personalizationFactors,
        confidence_score: response.confidence,
        style_adjustments: response.styleAdjustments
      };

      await supabase
        .from('ai_learning_outcomes')
        .insert({
          lead_id: leadId,
          outcome_type: 'personalization_applied',
          outcome_value: response.confidence,
          success_factors: learningData as any
        });

    } catch (error) {
      console.error('❌ [PERSONALIZATION] Error tracking usage:', error);
      // Don't throw - tracking is non-critical
    }
  }

  async updatePersonalizationProfile(
    leadId: string, 
    feedback: { 
      responseReceived?: boolean; 
      engagementType?: string; 
      satisfactionLevel?: number; 
    }
  ): Promise<void> {
    try {
      const profile = await this.getPersonalizationProfile(leadId);
      
      // Update profile based on feedback
      if (feedback.responseReceived) {
        profile.urgencyLevel = Math.min(profile.urgencyLevel + 1, 10);
      }
      
      if (feedback.satisfactionLevel) {
        // Adjust communication style based on satisfaction
        if (feedback.satisfactionLevel < 3 && profile.communicationStyle === 'casual') {
          profile.communicationStyle = 'professional';
        }
      }
      
      profile.lastUpdated = new Date();
      
      // Save updated profile
      await this.saveProfileToContext(leadId, profile);
      
      // Update cache
      this.profileCache.set(leadId, profile);
      
      console.log('✅ [PERSONALIZATION] Updated profile for lead:', leadId);
      
    } catch (error) {
      console.error('❌ [PERSONALIZATION] Error updating profile:', error);
    }
  }

  async getPersonalizationInsights(): Promise<any> {
    try {
      // Get global personalization insights
      const { data: contextData } = await supabase
        .from('ai_conversation_context')
        .select('lead_preferences, response_style, context_score')
        .not('lead_preferences', 'is', null)
        .limit(100);

      if (!contextData) {
        return {
          totalProfiles: 0,
          topCommunicationStyles: [],
          averageUrgencyLevel: 5,
          topVehiclePreferences: []
        };
      }

      // Analyze patterns
      const communicationStyles = contextData.map(d => d.lead_preferences?.communicationStyle).filter(Boolean);
      const urgencyLevels = contextData.map(d => d.context_score).filter(Boolean);
      const vehiclePrefs = contextData.flatMap(d => d.lead_preferences?.vehiclePreferences || []);

      return {
        totalProfiles: contextData.length,
        topCommunicationStyles: this.getTopItems(communicationStyles),
        averageUrgencyLevel: urgencyLevels.reduce((sum, level) => sum + level, 0) / urgencyLevels.length || 5,
        topVehiclePreferences: this.getTopItems(vehiclePrefs)
      };

    } catch (error) {
      console.error('❌ [PERSONALIZATION] Error getting insights:', error);
      return {
        totalProfiles: 0,
        topCommunicationStyles: [],
        averageUrgencyLevel: 5,
        topVehiclePreferences: []
      };
    }
  }

  private getTopItems(items: string[]): Array<{ item: string; count: number }> {
    const counts = items.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .map(([item, count]) => ({ item, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }
}

export const advancedPersonalizationEngine = new AdvancedPersonalizationEngineService();
