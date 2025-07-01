
import { supabase } from '@/integrations/supabase/client';
import { crossConversationIntelligence } from './crossConversationIntelligence';

interface PersonalizationProfile {
  leadId: string;
  communicationStyle: 'formal' | 'casual' | 'enthusiastic' | 'direct';
  preferredTopics: string[];
  responsePatterns: any;
  emotionalProfile: any;
  engagementLevel: number;
}

interface PersonalizedResponse {
  message: string;
  confidence: number;
  personalizationFactors: string[];
  emotionalTone: string;
}

class AdvancedPersonalizationEngine {
  private profileCache = new Map<string, PersonalizationProfile>();

  async generatePersonalizedResponse(
    leadId: string,
    baseMessage: string,
    context: {
      customerMessage?: string;
      conversationHistory?: string[];
      vehicleInterest?: string;
    }
  ): Promise<PersonalizedResponse> {
    try {
      console.log('🎯 [PERSONALIZATION] Generating personalized response for:', leadId);

      // Get or build personalization profile
      const profile = await this.getPersonalizationProfile(leadId);
      
      // Apply personalization layers
      let personalizedMessage = baseMessage;
      const factors: string[] = [];

      // Layer 1: Communication style adaptation
      personalizedMessage = this.adaptCommunicationStyle(personalizedMessage, profile, factors);

      // Layer 2: Emotional tone adjustment
      personalizedMessage = this.adjustEmotionalTone(personalizedMessage, profile, context, factors);

      // Layer 3: Content personalization
      personalizedMessage = await this.personalizeContent(personalizedMessage, profile, context, factors);

      // Layer 4: Timing and urgency adjustment
      personalizedMessage = this.adjustTimingAndUrgency(personalizedMessage, profile, factors);

      const confidence = this.calculatePersonalizationConfidence(profile, factors);

      return {
        message: personalizedMessage,
        confidence,
        personalizationFactors: factors,
        emotionalTone: profile.emotionalProfile?.dominantTone || 'neutral'
      };

    } catch (error) {
      console.error('❌ [PERSONALIZATION] Error generating personalized response:', error);
      return {
        message: baseMessage,
        confidence: 0.5,
        personalizationFactors: ['fallback'],
        emotionalTone: 'neutral'
      };
    }
  }

  private async getPersonalizationProfile(leadId: string): Promise<PersonalizationProfile> {
    // Check cache first
    if (this.profileCache.has(leadId)) {
      return this.profileCache.get(leadId)!;
    }

    try {
      // Build profile from conversation history and lead data
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: true });

      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (!conversations || !lead) {
        return this.createDefaultProfile(leadId);
      }

      const profile = this.analyzeConversationPatterns(leadId, conversations, lead);
      
      // Cache the profile
      this.profileCache.set(leadId, profile);
      
      return profile;

    } catch (error) {
      console.error('❌ [PERSONALIZATION] Error building profile:', error);
      return this.createDefaultProfile(leadId);
    }
  }

  private createDefaultProfile(leadId: string): PersonalizationProfile {
    return {
      leadId,
      communicationStyle: 'casual',
      preferredTopics: [],
      responsePatterns: {},
      emotionalProfile: { dominantTone: 'neutral', enthusiasm: 0.5 },
      engagementLevel: 0.5
    };
  }

  private analyzeConversationPatterns(leadId: string, conversations: any[], lead: any): PersonalizationProfile {
    const customerMessages = conversations.filter(c => c.direction === 'in');
    
    // Analyze communication style from customer messages
    const communicationStyle = this.determineCommunicationStyle(customerMessages);
    
    // Extract preferred topics
    const preferredTopics = this.extractPreferredTopics(customerMessages, lead.vehicle_interest);
    
    // Analyze emotional profile
    const emotionalProfile = this.analyzeEmotionalProfile(customerMessages);
    
    // Calculate engagement level
    const engagementLevel = this.calculateEngagementLevel(conversations);

    return {
      leadId,
      communicationStyle,
      preferredTopics,
      responsePatterns: this.extractResponsePatterns(conversations),
      emotionalProfile,
      engagementLevel
    };
  }

  private determineCommunicationStyle(messages: any[]): PersonalizationProfile['communicationStyle'] {
    if (messages.length === 0) return 'casual';

    const messageTexts = messages.map(m => m.body.toLowerCase());
    const totalLength = messageTexts.join(' ').length;
    const avgLength = totalLength / messages.length;

    // Analyze formality indicators
    const formalWords = ['please', 'thank you', 'could you', 'would you', 'appreciate'];
    const casualWords = ['hey', 'yeah', 'cool', 'awesome', 'thanks'];
    const directWords = ['need', 'want', 'how much', 'when', 'where'];

    const formalScore = this.countWordsInTexts(messageTexts, formalWords);
    const casualScore = this.countWordsInTexts(messageTexts, casualWords);
    const directScore = this.countWordsInTexts(messageTexts, directWords);

    // Long messages often indicate formal communication
    if (avgLength > 100 || formalScore > casualScore + directScore) {
      return 'formal';
    } else if (directScore > formalScore + casualScore) {
      return 'direct';
    } else if (casualScore > 0 || avgLength < 50) {
      return 'casual';
    }

    return 'casual';
  }

  private countWordsInTexts(texts: string[], words: string[]): number {
    return texts.reduce((count, text) => {
      return count + words.reduce((wordCount, word) => {
        return wordCount + (text.includes(word) ? 1 : 0);
      }, 0);
    }, 0);
  }

  private extractPreferredTopics(messages: any[], vehicleInterest: string): string[] {
    const topics = new Set<string>();

    // Add vehicle interest as primary topic
    if (vehicleInterest) topics.add('vehicle_specs');

    const messageText = messages.map(m => m.body.toLowerCase()).join(' ');

    // Topic detection
    if (messageText.includes('financing') || messageText.includes('payment')) {
      topics.add('financing');
    }
    if (messageText.includes('trade') || messageText.includes('current car')) {
      topics.add('trade_in');
    }
    if (messageText.includes('warranty') || messageText.includes('service')) {
      topics.add('warranty_service');
    }
    if (messageText.includes('features') || messageText.includes('options')) {
      topics.add('vehicle_features');
    }

    return Array.from(topics);
  }

  private analyzeEmotionalProfile(messages: any[]): any {
    const messageText = messages.map(m => m.body.toLowerCase()).join(' ');
    
    // Simple sentiment analysis
    const positiveWords = ['great', 'awesome', 'perfect', 'love', 'excited', 'interested'];
    const negativeWords = ['concerned', 'worried', 'expensive', 'problem', 'issue'];
    const enthusiasticWords = ['wow', 'amazing', 'fantastic', '!', 'really'];

    const positiveScore = this.countWordsInTexts([messageText], positiveWords);
    const negativeScore = this.countWordsInTexts([messageText], negativeWords);
    const enthusiasmScore = this.countWordsInTexts([messageText], enthusiasticWords);

    let dominantTone = 'neutral';
    if (positiveScore > negativeScore + 1) dominantTone = 'positive';
    else if (negativeScore > positiveScore + 1) dominantTone = 'cautious';

    return {
      dominantTone,
      enthusiasm: Math.min(enthusiasmScore / Math.max(messages.length, 1), 1),
      positivity: positiveScore / Math.max(positiveScore + negativeScore, 1)
    };
  }

  private extractResponsePatterns(conversations: any[]): any {
    const outgoingMessages = conversations.filter(c => c.direction === 'out');
    const incomingMessages = conversations.filter(c => c.direction === 'in');

    return {
      avgResponseTime: this.calculateAvgResponseTime(conversations),
      responseRate: incomingMessages.length / Math.max(outgoingMessages.length, 1),
      preferredMessageLength: incomingMessages.reduce((sum, m) => sum + m.body.length, 0) / Math.max(incomingMessages.length, 1)
    };
  }

  private calculateAvgResponseTime(conversations: any[]): number {
    // Calculate average time between outgoing and incoming messages
    let totalTime = 0;
    let responseCount = 0;

    for (let i = 0; i < conversations.length - 1; i++) {
      if (conversations[i].direction === 'out' && conversations[i + 1].direction === 'in') {
        const timeDiff = new Date(conversations[i + 1].sent_at).getTime() - new Date(conversations[i].sent_at).getTime();
        totalTime += timeDiff;
        responseCount++;
      }
    }

    return responseCount > 0 ? totalTime / responseCount / (1000 * 60 * 60) : 24; // Return in hours
  }

  private calculateEngagementLevel(conversations: any[]): number {
    const recentDays = 7;
    const recentDate = new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000);
    const recentMessages = conversations.filter(c => new Date(c.sent_at) > recentDate);
    
    const totalMessages = conversations.length;
    const recentEngagement = recentMessages.length / Math.max(recentDays, 1);
    
    return Math.min(recentEngagement / 2, 1); // Normalize to 0-1 scale
  }

  private adaptCommunicationStyle(
    message: string, 
    profile: PersonalizationProfile, 
    factors: string[]
  ): string {
    let adapted = message;

    switch (profile.communicationStyle) {
      case 'formal':
        adapted = this.makeFormal(adapted);
        factors.push('formal_communication');
        break;
      case 'casual':
        adapted = this.makeCasual(adapted);
        factors.push('casual_communication');
        break;
      case 'direct':
        adapted = this.makeDirect(adapted);
        factors.push('direct_communication');
        break;
      case 'enthusiastic':
        adapted = this.makeEnthusiastic(adapted);
        factors.push('enthusiastic_communication');
        break;
    }

    return adapted;
  }

  private makeFormal(message: string): string {
    return message
      .replace(/Hi\s/gi, 'Good day ')
      .replace(/Thanks/gi, 'Thank you')
      .replace(/\bhey\b/gi, 'hello')
      .replace(/!+/g, '.');
  }

  private makeCasual(message: string): string {
    return message
      .replace(/Good day/gi, 'Hi')
      .replace(/Thank you very much/gi, 'Thanks')
      .replace(/I would be/gi, "I'd be")
      .replace(/cannot/gi, "can't");
  }

  private makeDirect(message: string): string {
    return message
      .replace(/I'd be happy to help you with/gi, 'Let me help with')
      .replace(/Would you like me to/gi, 'I can')
      .replace(/Perhaps we could/gi, 'We can');
  }

  private makeEnthusiastic(message: string): string {
    return message
      .replace(/\./g, '!')
      .replace(/That's good/gi, "That's fantastic")
      .replace(/I can help/gi, "I'd love to help");
  }

  private adjustEmotionalTone(
    message: string,
    profile: PersonalizationProfile,
    context: any,
    factors: string[]
  ): string {
    let adjusted = message;

    if (profile.emotionalProfile?.dominantTone === 'cautious') {
      adjusted = this.addReassurance(adjusted);
      factors.push('reassuring_tone');
    } else if (profile.emotionalProfile?.dominantTone === 'positive') {
      adjusted = this.amplifyPositivity(adjusted);
      factors.push('positive_tone');
    }

    if (profile.emotionalProfile?.enthusiasm > 0.7) {
      adjusted = this.addEnthusiasm(adjusted);
      factors.push('enthusiastic_tone');
    }

    return adjusted;
  }

  private addReassurance(message: string): string {
    if (!message.toLowerCase().includes('no pressure')) {
      return message + ' No pressure at all - we\'re here when you\'re ready.';
    }
    return message;
  }

  private amplifyPositivity(message: string): string {
    return message
      .replace(/good/gi, 'great')
      .replace(/okay/gi, 'perfect')
      .replace(/help/gi, 'assist');
  }

  private addEnthusiasm(message: string): string {
    return message.replace(/(\w+)(\s*!)/, '$1$2').replace(/\.$/, '!');
  }

  private async personalizeContent(
    message: string,
    profile: PersonalizationProfile,
    context: any,
    factors: string[]
  ): Promise<string> {
    let personalized = message;

    // Add topic-specific personalization
    if (profile.preferredTopics.includes('financing') && !message.toLowerCase().includes('financing')) {
      personalized += ' I can also discuss financing options if that would be helpful.';
      factors.push('financing_focus');
    }

    if (profile.preferredTopics.includes('trade_in') && !message.toLowerCase().includes('trade')) {
      personalized += ' And we can definitely talk about your trade-in when you\'re ready.';
      factors.push('trade_in_awareness');
    }

    // Use global learning insights
    try {
      const optimized = await crossConversationIntelligence.optimizeResponseWithGlobalLearning(
        personalized,
        { leadId: profile.leadId, messageType: 'personalized' }
      );
      
      if (optimized !== personalized) {
        factors.push('global_optimization');
        personalized = optimized;
      }
    } catch (error) {
      console.log('Global optimization not available, continuing with personalized response');
    }

    return personalized;
  }

  private adjustTimingAndUrgency(
    message: string,
    profile: PersonalizationProfile,
    factors: string[]
  ): string {
    let adjusted = message;

    // Adjust urgency based on engagement level
    if (profile.engagementLevel > 0.8 && !message.toLowerCase().includes('when')) {
      adjusted += ' When would be a good time to continue our conversation?';
      factors.push('high_engagement_urgency');
    } else if (profile.engagementLevel < 0.3) {
      adjusted = adjusted.replace(/Let me know/gi, 'Feel free to reach out whenever you\'re ready');
      factors.push('low_pressure_approach');
    }

    return adjusted;
  }

  private calculatePersonalizationConfidence(
    profile: PersonalizationProfile,
    factors: string[]
  ): number {
    let confidence = 0.5; // Base confidence

    // More conversation history = higher confidence
    if (profile.responsePatterns?.responseRate > 0.5) confidence += 0.2;
    if (profile.engagementLevel > 0.6) confidence += 0.15;
    if (profile.preferredTopics.length > 2) confidence += 0.1;
    if (factors.length > 3) confidence += 0.05;

    return Math.min(confidence, 0.95);
  }

  async updatePersonalizationProfile(leadId: string, feedback: {
    responseReceived?: boolean;
    engagementType?: string;
    satisfactionLevel?: number;
  }): Promise<void> {
    try {
      const profile = this.profileCache.get(leadId);
      if (!profile) return;

      // Update engagement level based on feedback
      if (feedback.responseReceived) {
        profile.engagementLevel = Math.min(profile.engagementLevel + 0.1, 1);
      }

      // Store learning data
      await supabase
        .from('ai_learning_outcomes')
        .insert({
          lead_id: leadId,
          outcome_type: 'personalization_feedback',
          outcome_value: feedback.satisfactionLevel,
          message_characteristics: {
            personalization_factors: profile,
            feedback: feedback
          }
        });

      console.log('✅ [PERSONALIZATION] Updated profile for:', leadId);

    } catch (error) {
      console.error('❌ [PERSONALIZATION] Error updating profile:', error);
    }
  }

  clearCache(): void {
    this.profileCache.clear();
    console.log('🧹 [PERSONALIZATION] Cache cleared');
  }
}

export const advancedPersonalizationEngine = new AdvancedPersonalizationEngine();
