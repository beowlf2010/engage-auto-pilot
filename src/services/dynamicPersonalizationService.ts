import { supabase } from '@/integrations/supabase/client';

interface PersonalizationRule {
  id: string;
  rule_name: string;
  rule_type: 'lead_source' | 'temperature' | 'persona' | 'timing';
  condition_criteria: any;
  response_modifications: any;
  priority: number;
  is_active: boolean;
  success_metrics: any;
}

interface ConversationPreference {
  preference_type: 'communication_style' | 'vehicle_preference' | 'timing_preference';
  preference_value: any;
  confidence_score: number;
  learned_from: string;
}

export class DynamicPersonalizationService {
  private static instance: DynamicPersonalizationService;

  static getInstance(): DynamicPersonalizationService {
    if (!DynamicPersonalizationService.instance) {
      DynamicPersonalizationService.instance = new DynamicPersonalizationService();
    }
    return DynamicPersonalizationService.instance;
  }

  // Learn and store customer preferences
  async learnCustomerPreferences(
    leadId: string,
    messageContent: string,
    customerResponse: string,
    leadData: any
  ): Promise<void> {
    console.log('🧠 [PERSONALIZATION] Learning customer preferences for lead:', leadId);

    // Analyze communication style
    const communicationStyle = this.analyzeCommunicationStyle(customerResponse);
    if (communicationStyle) {
      await this.storePreference(leadId, 'communication_style', communicationStyle, 'response_analysis');
    }

    // Extract vehicle preferences
    const vehiclePreferences = this.extractVehiclePreferences(customerResponse, messageContent);
    if (vehiclePreferences) {
      await this.storePreference(leadId, 'vehicle_preference', vehiclePreferences, 'conversation_analysis');
    }

    // Determine timing preferences
    const timingPreferences = await this.analyzeTimingPreferences(leadId, leadData);
    if (timingPreferences) {
      await this.storePreference(leadId, 'timing_preference', timingPreferences, 'interaction_pattern');
    }
  }

  private async storePreference(
    leadId: string,
    preferenceType: ConversationPreference['preference_type'],
    preferenceValue: any,
    learnedFrom: string
  ): Promise<void> {
    // Check if preference already exists
    const { data: existing, error: fetchError } = await supabase
      .from('ai_conversation_preferences')
      .select('*')
      .eq('lead_id', leadId)
      .eq('preference_type', preferenceType)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching existing preference:', fetchError);
      return;
    }

    if (existing) {
      // Update existing preference with weighted average
      const newConfidence = Math.min(existing.confidence_score + 0.1, 1.0);
      const mergedValue = this.mergePreferenceValues(existing.preference_value, preferenceValue);

      await supabase
        .from('ai_conversation_preferences')
        .update({
          preference_value: mergedValue,
          confidence_score: newConfidence,
          learned_from: `${existing.learned_from}, ${learnedFrom}`,
          last_validated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      // Create new preference
      await supabase
        .from('ai_conversation_preferences')
        .insert({
          lead_id: leadId,
          preference_type: preferenceType,
          preference_value: preferenceValue,
          confidence_score: 0.7,
          learned_from: learnedFrom
        });
    }
  }

  private analyzeCommunicationStyle(customerResponse: string): any | null {
    const response = customerResponse.toLowerCase();
    
    const styles = {
      formal: ['thank you', 'appreciate', 'kindly', 'please', 'sincerely'],
      casual: ['hey', 'yeah', 'cool', 'awesome', 'sounds good', 'thx', 'thanks'],
      direct: ['yes', 'no', 'when', 'how much', 'what time', 'schedule'],
      detailed: ['because', 'specifically', 'exactly', 'details', 'information']
    };

    const scores = Object.entries(styles).map(([style, keywords]) => {
      const matches = keywords.filter(keyword => response.includes(keyword)).length;
      return { style, score: matches };
    });

    const dominantStyle = scores.reduce((prev, current) => 
      current.score > prev.score ? current : prev
    );

    return dominantStyle.score > 0 ? {
      primary_style: dominantStyle.style,
      confidence: Math.min(dominantStyle.score / 3, 1.0),
      detected_patterns: scores.filter(s => s.score > 0)
    } : null;
  }

  private extractVehiclePreferences(customerResponse: string, messageContent: string): any | null {
    const response = customerResponse.toLowerCase();
    
    const preferences = {
      price_sensitivity: this.detectPriceSensitivity(response),
      feature_priorities: this.detectFeaturePriorities(response),
      vehicle_type: this.detectVehicleTypePreference(response),
      brand_preference: this.detectBrandPreference(response)
    };

    const hasPreferences = Object.values(preferences).some(pref => pref !== null);
    return hasPreferences ? preferences : null;
  }

  private detectPriceSensitivity(response: string): string | null {
    if (response.includes('budget') || response.includes('affordable') || response.includes('cheap')) {
      return 'price_conscious';
    }
    if (response.includes('best') || response.includes('premium') || response.includes('luxury')) {
      return 'quality_focused';
    }
    if (response.includes('payment') || response.includes('monthly') || response.includes('finance')) {
      return 'payment_focused';
    }
    return null;
  }

  private detectFeaturePriorities(response: string): string[] {
    const features = {
      'fuel_economy': ['mpg', 'gas', 'fuel', 'economy', 'efficient'],
      'safety': ['safe', 'safety', 'secure', 'protection', 'airbag'],
      'technology': ['tech', 'bluetooth', 'navigation', 'screen', 'connectivity'],
      'performance': ['power', 'speed', 'performance', 'engine', 'horsepower'],
      'comfort': ['comfort', 'seats', 'space', 'room', 'interior'],
      'reliability': ['reliable', 'dependable', 'maintenance', 'warranty']
    };

    const detectedFeatures = [];
    for (const [feature, keywords] of Object.entries(features)) {
      if (keywords.some(keyword => response.includes(keyword))) {
        detectedFeatures.push(feature);
      }
    }

    return detectedFeatures;
  }

  private detectVehicleTypePreference(response: string): string | null {
    const types = {
      'suv': ['suv', 'crossover', 'utility'],
      'sedan': ['sedan', 'car'],
      'truck': ['truck', 'pickup'],
      'coupe': ['coupe', 'sports'],
      'convertible': ['convertible', 'roadster']
    };

    for (const [type, keywords] of Object.entries(types)) {
      if (keywords.some(keyword => response.includes(keyword))) {
        return type;
      }
    }
    return null;
  }

  private detectBrandPreference(response: string): string | null {
    const brands = ['chevrolet', 'chevy', 'gmc', 'cadillac', 'buick', 'ford', 'toyota', 'honda'];
    
    for (const brand of brands) {
      if (response.includes(brand)) {
        return brand;
      }
    }
    return null;
  }

  private async analyzeTimingPreferences(leadId: string, leadData: any): Promise<any | null> {
    // Get conversation history to analyze timing patterns
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('sent_at, direction')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: true });

    if (error || !conversations || conversations.length < 3) {
      return null;
    }

    const responsePattern = this.analyzeResponseTiming(conversations);
    return responsePattern;
  }

  private analyzeResponseTiming(conversations: any[]): any {
    const responses = conversations.filter(c => c.direction === 'in');
    
    if (responses.length < 2) return null;

    const hours = responses.map(r => new Date(r.sent_at).getHours());
    const dayPattern = this.findPreferredTimePattern(hours);
    
    return {
      preferred_hours: dayPattern.peak_hours,
      response_speed: dayPattern.avg_response_time,
      active_days: dayPattern.active_days
    };
  }

  private findPreferredTimePattern(hours: number[]): any {
    const hourCounts = hours.reduce((acc, hour) => {
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const peakHours = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    return {
      peak_hours: peakHours,
      avg_response_time: 'fast', // Simplified
      active_days: ['weekday'] // Simplified
    };
  }

  private mergePreferenceValues(existing: any, newValue: any): any {
    // Merge preference values intelligently
    if (typeof existing === 'object' && typeof newValue === 'object') {
      return { ...existing, ...newValue };
    }
    return newValue;
  }

  // Apply personalization to message content
  async personalizeMessage(
    leadId: string,
    baseMessage: string,
    leadData: any
  ): Promise<string> {
    console.log('🎯 [PERSONALIZATION] Personalizing message for lead:', leadId);

    // Get stored preferences
    const { data: preferences, error } = await supabase
      .from('ai_conversation_preferences')
      .select('*')
      .eq('lead_id', leadId);

    if (error || !preferences || preferences.length === 0) {
      console.log('No stored preferences found, using lead-based personalization');
      return await this.applyLeadBasedPersonalization(baseMessage, leadData);
    }

    let personalizedMessage = baseMessage;

    // Apply communication style preferences
    const stylePrefs = preferences.find(p => p.preference_type === 'communication_style');
    if (stylePrefs) {
      personalizedMessage = this.applyCommunicationStyle(personalizedMessage, stylePrefs.preference_value);
    }

    // Apply vehicle preferences
    const vehiclePrefs = preferences.find(p => p.preference_type === 'vehicle_preference');
    if (vehiclePrefs) {
      personalizedMessage = await this.applyVehiclePreferences(personalizedMessage, vehiclePrefs.preference_value, leadData);
    }

    // Apply timing context if needed
    const timingPrefs = preferences.find(p => p.preference_type === 'timing_preference');
    if (timingPrefs) {
      personalizedMessage = this.applyTimingContext(personalizedMessage, timingPrefs.preference_value);
    }

    return personalizedMessage;
  }

  private applyCommunicationStyle(message: string, stylePrefs: any): string {
    const { primary_style } = stylePrefs;

    switch (primary_style) {
      case 'formal':
        return message
          .replace(/Hi/g, 'Hello')
          .replace(/Thanks/g, 'Thank you')
          .replace(/!/g, '.');
      
      case 'casual':
        return message
          .replace(/Hello/g, 'Hi')
          .replace(/Thank you/g, 'Thanks')
          .replace(/\./g, '!');
      
      case 'direct':
        return message
          .replace(/I hope this message finds you well\. /g, '')
          .replace(/I wanted to reach out /g, '')
          .split('. ').filter(sentence => !sentence.includes('hope')).join('. ');
      
      default:
        return message;
    }
  }

  private async applyVehiclePreferences(message: string, vehiclePrefs: any, leadData: any): Promise<string> {
    let enhancedMessage = message;

    // Add price-sensitive messaging
    if (vehiclePrefs.price_sensitivity === 'price_conscious') {
      enhancedMessage += ' We have great financing options and competitive pricing available.';
    }

    // Mention preferred features
    if (vehiclePrefs.feature_priorities && vehiclePrefs.feature_priorities.length > 0) {
      const topFeature = vehiclePrefs.feature_priorities[0];
      enhancedMessage += ` This vehicle excels in ${topFeature.replace('_', ' ')}.`;
    }

    return enhancedMessage;
  }

  private applyTimingContext(message: string, timingPrefs: any): string {
    const currentHour = new Date().getHours();
    const { preferred_hours } = timingPrefs;

    if (preferred_hours && !preferred_hours.includes(currentHour)) {
      return `${message} (Sending at your preferred time)`;
    }

    return message;
  }

  private async applyLeadBasedPersonalization(message: string, leadData: any): Promise<string> {
    let personalizedMessage = message;

    // Personalize based on lead source
    if (leadData.source) {
      if (leadData.source.toLowerCase().includes('referral')) {
        personalizedMessage = personalizedMessage.replace(
          'Thank you for your interest',
          'Thank you for being referred to us'
        );
      }
    }

    // Personalize based on vehicle interest
    if (leadData.vehicle_interest && leadData.vehicle_interest !== 'General Inquiry') {
      personalizedMessage += ` I see you're interested in ${leadData.vehicle_interest}.`;
    }

    return personalizedMessage;
  }

  // Get personalization rules
  async getActivePersonalizationRules(): Promise<PersonalizationRule[]> {
    const { data: rules, error } = await supabase
      .from('ai_personalization_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (error) {
      console.error('Failed to get personalization rules:', error);
      return [];
    }

    return (rules || []).map(rule => ({
      ...rule,
      rule_type: rule.rule_type as PersonalizationRule['rule_type']
    }));
  }

  // Create new personalization rule
  async createPersonalizationRule(
    ruleName: string,
    ruleType: PersonalizationRule['rule_type'],
    conditionCriteria: any,
    responseModifications: any,
    priority: number = 100
  ): Promise<string> {
    const { data, error } = await supabase
      .from('ai_personalization_rules')
      .insert({
        rule_name: ruleName,
        rule_type: ruleType,
        condition_criteria: conditionCriteria,
        response_modifications: responseModifications,
        priority,
        is_active: true
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create personalization rule:', error);
      throw error;
    }

    return data.id;
  }
}

export const dynamicPersonalizationService = DynamicPersonalizationService.getInstance();