
interface PersonalizationProfile {
  leadId: string;
  communicationStyle: 'formal' | 'casual' | 'direct' | 'friendly';
  responseTimePreference: 'immediate' | 'business_hours' | 'flexible';
  interestLevel: 'high' | 'medium' | 'low';
  priceConsciousness: 'budget' | 'value' | 'premium' | 'unknown';
  decisionSpeed: 'quick' | 'thoughtful' | 'analytical';
  preferredTopics: string[];
  avoidanceTopics: string[];
  lastUpdated: Date;
}

interface PersonalizedResponse {
  message: string;
  confidence: number;
  personalizationFactors: string[];
}

class AdvancedPersonalizationEngine {
  private profiles: Map<string, PersonalizationProfile> = new Map();

  async generatePersonalizedResponse(
    leadId: string,
    baseMessage: string,
    context: {
      customerMessage: string;
      conversationHistory: string[];
      vehicleInterest: string;
    }
  ): Promise<PersonalizedResponse> {
    console.log('👤 [PERSONALIZATION] Generating personalized response...');

    try {
      // Get or create personalization profile
      let profile = await this.getPersonalizationProfile(leadId);
      
      if (!profile) {
        profile = await this.createPersonalizationProfile(leadId, context);
      } else {
        profile = await this.updatePersonalizationProfile(leadId, context);
      }

      // Apply personalization to base message
      const personalizedMessage = this.applyPersonalization(baseMessage, profile, context);
      
      // Calculate confidence based on profile completeness
      const confidence = this.calculatePersonalizationConfidence(profile);
      
      const result: PersonalizedResponse = {
        message: personalizedMessage,
        confidence,
        personalizationFactors: this.getAppliedFactors(profile)
      };

      console.log(`✅ [PERSONALIZATION] Applied ${result.personalizationFactors.length} factors with ${Math.round(confidence * 100)}% confidence`);
      return result;
    } catch (error) {
      console.error('❌ [PERSONALIZATION] Personalization failed:', error);
      return {
        message: baseMessage,
        confidence: 0.5,
        personalizationFactors: ['fallback']
      };
    }
  }

  private async getPersonalizationProfile(leadId: string): Promise<PersonalizationProfile | null> {
    return this.profiles.get(leadId) || null;
  }

  private async createPersonalizationProfile(
    leadId: string,
    context: any
  ): Promise<PersonalizationProfile> {
    console.log('📊 [PERSONALIZATION] Creating new profile for lead:', leadId);

    const profile: PersonalizationProfile = {
      leadId,
      communicationStyle: this.detectCommunicationStyle(context.customerMessage),
      responseTimePreference: 'business_hours',
      interestLevel: this.detectInterestLevel(context.conversationHistory),
      priceConsciousness: this.detectPriceConsciousness(context.customerMessage, context.conversationHistory),
      decisionSpeed: this.detectDecisionSpeed(context.conversationHistory),
      preferredTopics: this.extractPreferredTopics(context),
      avoidanceTopics: [],
      lastUpdated: new Date()
    };

    this.profiles.set(leadId, profile);
    return profile;
  }

  private async updatePersonalizationProfile(
    leadId: string,
    context: any
  ): Promise<PersonalizationProfile> {
    const profile = this.profiles.get(leadId)!;
    
    // Update based on new interactions
    profile.communicationStyle = this.detectCommunicationStyle(context.customerMessage);
    profile.interestLevel = this.detectInterestLevel(context.conversationHistory);
    profile.lastUpdated = new Date();

    this.profiles.set(leadId, profile);
    return profile;
  }

  private detectCommunicationStyle(message: string): PersonalizationProfile['communicationStyle'] {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('please') || lowerMessage.includes('thank you') || lowerMessage.includes('sir') || lowerMessage.includes('ma\'am')) {
      return 'formal';
    } else if (lowerMessage.includes('hey') || lowerMessage.includes('awesome') || lowerMessage.includes('cool') || lowerMessage.includes('!')) {
      return 'casual';
    } else if (lowerMessage.length < 10 && !lowerMessage.includes('?')) {
      return 'direct';
    } else {
      return 'friendly';
    }
  }

  private detectInterestLevel(conversationHistory: string[]): PersonalizationProfile['interestLevel'] {
    const messageCount = conversationHistory.length;
    const hasQuestions = conversationHistory.some(msg => msg.includes('?'));
    const hasSpecificInquiries = conversationHistory.some(msg => 
      msg.toLowerCase().includes('price') || 
      msg.toLowerCase().includes('available') || 
      msg.toLowerCase().includes('schedule')
    );

    if (hasSpecificInquiries && messageCount > 3) {
      return 'high';
    } else if (hasQuestions || messageCount > 1) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private detectPriceConsciousness(message: string, conversationHistory: string[]): PersonalizationProfile['priceConsciousness'] {
    const allMessages = [message, ...conversationHistory].join(' ').toLowerCase();
    
    if (allMessages.includes('cheap') || allMessages.includes('budget') || allMessages.includes('affordable')) {
      return 'budget';
    } else if (allMessages.includes('luxury') || allMessages.includes('premium') || allMessages.includes('high-end')) {
      return 'premium';
    } else if (allMessages.includes('value') || allMessages.includes('deal') || allMessages.includes('price')) {
      return 'value';
    } else {
      return 'unknown';
    }
  }

  private detectDecisionSpeed(conversationHistory: string[]): PersonalizationProfile['decisionSpeed'] {
    if (conversationHistory.length < 2) {
      return 'quick';
    } else if (conversationHistory.length > 5) {
      return 'analytical';
    } else {
      return 'thoughtful';
    }
  }

  private extractPreferredTopics(context: any): string[] {
    const topics: string[] = [];
    const allText = [context.customerMessage, context.vehicleInterest].join(' ').toLowerCase();
    
    if (allText.includes('fuel') || allText.includes('mpg') || allText.includes('gas')) {
      topics.push('fuel_efficiency');
    }
    if (allText.includes('safety') || allText.includes('airbag') || allText.includes('rating')) {
      topics.push('safety_features');
    }
    if (allText.includes('tech') || allText.includes('screen') || allText.includes('bluetooth')) {
      topics.push('technology');
    }
    if (allText.includes('warranty') || allText.includes('service') || allText.includes('maintenance')) {
      topics.push('service_warranty');
    }
    
    return topics;
  }

  private applyPersonalization(
    baseMessage: string,
    profile: PersonalizationProfile,
    context: any
  ): string {
    let personalizedMessage = baseMessage;

    // Apply communication style
    personalizedMessage = this.applyCommunicationStyle(personalizedMessage, profile.communicationStyle);
    
    // Apply interest level adjustments
    personalizedMessage = this.applyInterestLevelPersonalization(personalizedMessage, profile.interestLevel);
    
    // Apply price consciousness
    personalizedMessage = this.applyPricePersonalization(personalizedMessage, profile.priceConsciousness);
    
    // Apply decision speed adjustments
    personalizedMessage = this.applyDecisionSpeedPersonalization(personalizedMessage, profile.decisionSpeed);

    return personalizedMessage;
  }

  private applyCommunicationStyle(message: string, style: PersonalizationProfile['communicationStyle']): string {
    switch (style) {
      case 'formal':
        return message.replace(/Hi|Hey/g, 'Hello').replace(/!+/g, '.') + ' Please let me know if you have any questions.';
      case 'casual':
        return message.replace(/Hello/g, 'Hey') + ' Let me know what you think!';
      case 'direct':
        return message.split('.')[0] + '. Interested?';
      case 'friendly':
      default:
        return message + ' I\'m here to help with any questions you might have!';
    }
  }

  private applyInterestLevelPersonalization(message: string, interestLevel: PersonalizationProfile['interestLevel']): string {
    switch (interestLevel) {
      case 'high':
        return message + ' I can prioritize this for you and get back with details today.';
      case 'medium':
        return message + ' Take your time to consider, and feel free to ask any questions.';
      case 'low':
      default:
        return message + ' No pressure - just wanted to share this option with you.';
    }
  }

  private applyPricePersonalization(message: string, priceConsciousness: PersonalizationProfile['priceConsciousness']): string {
    switch (priceConsciousness) {
      case 'budget':
        return message + ' I can also discuss financing options that work within your budget.';
      case 'premium':
        return message + ' This model includes premium features that enhance the ownership experience.';
      case 'value':
        return message + ' This represents excellent value with its combination of features and reliability.';
      case 'unknown':
      default:
        return message;
    }
  }

  private applyDecisionSpeedPersonalization(message: string, decisionSpeed: PersonalizationProfile['decisionSpeed']): string {
    switch (decisionSpeed) {
      case 'quick':
        return message + ' If you\'d like to move forward, I can expedite the process for you.';
      case 'analytical':
        return message + ' I can provide detailed specifications and comparisons to help with your analysis.';
      case 'thoughtful':
      default:
        return message + ' Take your time to think it over, and I\'ll follow up in a few days.';
    }
  }

  private calculatePersonalizationConfidence(profile: PersonalizationProfile): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on profile completeness
    if (profile.preferredTopics.length > 0) confidence += 0.1;
    if (profile.priceConsciousness !== 'unknown') confidence += 0.1;
    if (profile.communicationStyle !== 'friendly') confidence += 0.1; // Not default
    
    // Increase confidence based on profile age (more interactions = higher confidence)
    const profileAge = Date.now() - profile.lastUpdated.getTime();
    if (profileAge > 24 * 60 * 60 * 1000) confidence += 0.2; // 24+ hours old
    
    return Math.min(confidence, 1.0);
  }

  private getAppliedFactors(profile: PersonalizationProfile): string[] {
    return [
      `communication_${profile.communicationStyle}`,
      `interest_${profile.interestLevel}`,
      `price_${profile.priceConsciousness}`,
      `decision_${profile.decisionSpeed}`,
      ...profile.preferredTopics.map(topic => `topic_${topic}`)
    ];
  }

  async updatePersonalizationProfile(
    leadId: string,
    feedback: {
      responseReceived: boolean;
      satisfactionLevel?: number;
    }
  ): Promise<void> {
    const profile = this.profiles.get(leadId);
    if (!profile) return;

    // Adjust profile based on feedback
    if (feedback.responseReceived) {
      // Positive feedback - reinforce current style
      console.log(`✅ [PERSONALIZATION] Positive feedback for lead ${leadId}`);
    } else {
      // No response - might need to adjust approach
      console.log(`⚠️ [PERSONALIZATION] No response from lead ${leadId}, may adjust approach`);
    }

    profile.lastUpdated = new Date();
    this.profiles.set(leadId, profile);
  }
}

export const advancedPersonalizationEngine = new AdvancedPersonalizationEngine();
