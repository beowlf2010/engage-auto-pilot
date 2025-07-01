interface PersonalizationProfile {
  leadId: string;
  communicationStyle: 'formal' | 'casual' | 'professional';
  preferredTopics: string[];
  responsePatterns: string[];
  engagementLevel: number;
  lastUpdated: Date;
}

interface PersonalizationContext {
  customerMessage: string;
  conversationHistory: string[];
  vehicleInterest: string;
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
    context: PersonalizationContext
  ): Promise<PersonalizedResponse> {
    console.log('🎭 [PERSONALIZATION] Generating personalized response...');

    try {
      // Get or create personalization profile
      let profile = this.profiles.get(leadId);
      if (!profile) {
        profile = await this.createPersonalizationProfile(leadId, context);
        this.profiles.set(leadId, profile);
      }

      // Apply personalization transformations
      let personalizedMessage = baseMessage;
      const factors: string[] = [];

      // Apply communication style
      personalizedMessage = this.applyCommunicationStyle(personalizedMessage, profile.communicationStyle);
      factors.push(`communication_style_${profile.communicationStyle}`);

      // Apply topic preferences
      personalizedMessage = this.applyTopicPreferences(personalizedMessage, profile.preferredTopics, context.vehicleInterest);
      factors.push('topic_preferences');

      // Apply engagement level adjustments
      personalizedMessage = this.applyEngagementLevel(personalizedMessage, profile.engagementLevel);
      factors.push(`engagement_level_${profile.engagementLevel}`);

      const confidence = this.calculatePersonalizationConfidence(profile, context);

      console.log(`✅ [PERSONALIZATION] Applied ${factors.length} personalization factors`);

      return {
        message: personalizedMessage,
        confidence,
        personalizationFactors: factors
      };

    } catch (error) {
      console.error('❌ [PERSONALIZATION] Error generating personalized response:', error);
      return {
        message: baseMessage,
        confidence: 0.5,
        personalizationFactors: ['fallback']
      };
    }
  }

  private async createPersonalizationProfile(
    leadId: string,
    context: PersonalizationContext
  ): Promise<PersonalizationProfile> {
    // Analyze communication style from conversation history
    const communicationStyle = this.analyzeCommunicationStyle(context.conversationHistory);
    
    // Extract preferred topics
    const preferredTopics = this.extractPreferredTopics(context);
    
    // Analyze response patterns
    const responsePatterns = this.analyzeResponsePatterns(context.conversationHistory);
    
    // Calculate engagement level
    const engagementLevel = this.calculateEngagementLevel(context.conversationHistory);

    return {
      leadId,
      communicationStyle,
      preferredTopics,
      responsePatterns,
      engagementLevel,
      lastUpdated: new Date()
    };
  }

  updatePersonalizationProfile(leadId: string, updates: any): void {
    const profile = this.profiles.get(leadId);
    if (profile) {
      // Update profile based on feedback
      if (updates.responseReceived) {
        profile.engagementLevel = Math.min(10, profile.engagementLevel + 1);
      }
      
      if (updates.satisfactionLevel) {
        profile.engagementLevel = Math.max(1, Math.min(10, updates.satisfactionLevel * 2));
      }
      
      profile.lastUpdated = new Date();
      this.profiles.set(leadId, profile);
    }
  }

  private analyzeCommunicationStyle(conversationHistory: string[]): 'formal' | 'casual' | 'professional' {
    const messages = conversationHistory.join(' ').toLowerCase();
    
    const formalIndicators = ['please', 'thank you', 'appreciate', 'regarding', 'sincerely'];
    const casualIndicators = ['hey', 'thanks', 'cool', 'awesome', 'yeah'];
    const professionalIndicators = ['information', 'details', 'specifications', 'requirements'];
    
    const formalScore = formalIndicators.reduce((score, word) => 
      score + (messages.split(word).length - 1), 0);
    const casualScore = casualIndicators.reduce((score, word) => 
      score + (messages.split(word).length - 1), 0);
    const professionalScore = professionalIndicators.reduce((score, word) => 
      score + (messages.split(word).length - 1), 0);
    
    if (formalScore > casualScore && formalScore > professionalScore) {
      return 'formal';
    } else if (casualScore > professionalScore) {
      return 'casual';
    } else {
      return 'professional';
    }
  }

  private extractPreferredTopics(context: PersonalizationContext): string[] {
    const topics: string[] = [];
    const combinedText = (context.conversationHistory.join(' ') + ' ' + context.vehicleInterest).toLowerCase();
    
    const topicKeywords = {
      'safety': ['safety', 'airbag', 'crash', 'secure'],
      'performance': ['performance', 'power', 'speed', 'engine'],
      'fuel_economy': ['fuel', 'mpg', 'economy', 'gas'],
      'technology': ['technology', 'tech', 'bluetooth', 'navigation'],
      'comfort': ['comfort', 'seat', 'interior', 'luxury'],
      'price': ['price', 'cost', 'budget', 'affordable'],
      'reliability': ['reliable', 'dependable', 'warranty', 'maintenance']
    };
    
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => combinedText.includes(keyword))) {
        topics.push(topic);
      }
    });
    
    return topics;
  }

  private analyzeResponsePatterns(conversationHistory: string[]): string[] {
    const patterns: string[] = [];
    
    if (conversationHistory.length > 0) {
      const avgLength = conversationHistory.reduce((sum, msg) => sum + msg.length, 0) / conversationHistory.length;
      
      if (avgLength > 100) {
        patterns.push('detailed_responses');
      } else if (avgLength < 30) {
        patterns.push('brief_responses');
      } else {
        patterns.push('moderate_responses');
      }
      
      const questionResponses = conversationHistory.filter(msg => msg.includes('?'));
      if (questionResponses.length > conversationHistory.length * 0.3) {
        patterns.push('question_heavy');
      }
    }
    
    return patterns;
  }

  private calculateEngagementLevel(conversationHistory: string[]): number {
    let engagementScore = 5; // Start at neutral
    
    // More messages = higher engagement
    engagementScore += Math.min(3, conversationHistory.length * 0.5);
    
    // Questions indicate engagement
    const questions = conversationHistory.filter(msg => msg.includes('?')).length;
    engagementScore += Math.min(2, questions);
    
    // Enthusiasm indicators
    const enthusiasm = conversationHistory.join(' ').toLowerCase();
    if (enthusiasm.includes('excited') || enthusiasm.includes('interested') || enthusiasm.includes('love')) {
      engagementScore += 2;
    }
    
    return Math.max(1, Math.min(10, Math.round(engagementScore)));
  }

  private applyCommunicationStyle(message: string, style: 'formal' | 'casual' | 'professional'): string {
    switch (style) {
      case 'formal':
        return message
          .replace(/Hi /g, 'Good day ')
          .replace(/Thanks/g, 'Thank you')
          .replace(/I'd/g, 'I would')
          .replace(/Let's/g, 'Let us');
      
      case 'casual':
        return message
          .replace(/Good day/g, 'Hey')
          .replace(/I would/g, 'I\'d')
          .replace(/Thank you/g, 'Thanks');
      
      case 'professional':
        return message
          .replace(/Hi /g, 'Hello ')
          .replace(/Thanks/g, 'Thank you');
      
      default:
        return message;
    }
  }

  private applyTopicPreferences(message: string, preferredTopics: string[], vehicleInterest: string): string {
    if (preferredTopics.includes('safety') && !message.toLowerCase().includes('safety')) {
      message += ' Safety is always a top priority with our vehicles.';
    }
    
    if (preferredTopics.includes('fuel_economy') && !message.toLowerCase().includes('fuel')) {
      message += ' Our fuel-efficient options can help you save at the pump.';
    }
    
    if (preferredTopics.includes('technology') && !message.toLowerCase().includes('tech')) {
      message += ' You\'ll love the latest technology features available.';
    }
    
    return message;
  }

  private applyEngagementLevel(message: string, engagementLevel: number): string {
    if (engagementLevel >= 8) {
      // High engagement - add enthusiasm
      return message + ' I\'m excited to help you find the perfect match!';
    } else if (engagementLevel <= 3) {
      // Low engagement - keep it simple
      return message.replace(/!/g, '.').replace(/\s+Let me.*/g, '');
    }
    
    return message;
  }

  private calculatePersonalizationConfidence(
    profile: PersonalizationProfile,
    context: PersonalizationContext
  ): number {
    let confidence = 0.5; // Base confidence
    
    // More conversation history = higher confidence
    confidence += Math.min(0.3, context.conversationHistory.length * 0.05);
    
    // More preferred topics = higher confidence
    confidence += Math.min(0.2, profile.preferredTopics.length * 0.05);
    
    // Higher engagement = higher confidence
    confidence += profile.engagementLevel * 0.03;
    
    return Math.min(1.0, confidence);
  }
}

export const advancedPersonalizationEngine = new AdvancedPersonalizationEngine();
