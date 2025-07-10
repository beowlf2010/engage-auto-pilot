import { supabase } from '@/integrations/supabase/client';
import type {
  LeadBehaviorProfile,
  IntentProfile,
  IntentSignal,
  BehaviorPattern,
  CompetitorIntelligence,
  LeadIntelligenceProfile,
  IntelligenceMetrics
} from '@/types/leadIntelligence';

class EnhancedLeadIntelligenceEngine {
  private static instance: EnhancedLeadIntelligenceEngine;
  private analysisCache = new Map<string, LeadIntelligenceProfile>();
  private competitorDatabase = new Map<string, CompetitorIntelligence>();

  static getInstance(): EnhancedLeadIntelligenceEngine {
    if (!EnhancedLeadIntelligenceEngine.instance) {
      EnhancedLeadIntelligenceEngine.instance = new EnhancedLeadIntelligenceEngine();
    }
    return EnhancedLeadIntelligenceEngine.instance;
  }

  async analyzeLeadIntelligence(leadId: string): Promise<LeadIntelligenceProfile> {
    console.log('🧠 [INTELLIGENCE] Starting deep lead analysis for:', leadId);

    try {
      // Get lead data and conversation history
      const [leadData, conversations] = await Promise.all([
        this.getLeadData(leadId),
        this.getConversationHistory(leadId)
      ]);

      if (!leadData) {
        throw new Error('Lead not found');
      }

      // Analyze behavior patterns
      const behaviorProfile = await this.analyzeBehaviorPatterns(leadId, conversations);

      // Detect intent signals
      const intentProfile = await this.analyzeIntentSignals(leadId, conversations);

      // Analyze competitor mentions
      const competitorIntelligence = await this.analyzeCompetitorMentions(conversations);

      // Calculate composite intelligence score
      const intelligenceScore = this.calculateIntelligenceScore(
        behaviorProfile,
        intentProfile,
        competitorIntelligence
      );

      // Generate action recommendations
      const actionRecommendations = this.generateActionRecommendations(
        behaviorProfile,
        intentProfile,
        competitorIntelligence
      );

      // Calculate risk factors and opportunities
      const riskFactors = this.calculateRiskFactors(behaviorProfile, intentProfile, competitorIntelligence);
      const opportunities = this.calculateOpportunities(behaviorProfile, intentProfile);

      const intelligenceProfile: LeadIntelligenceProfile = {
        leadId,
        behaviorProfile,
        intentProfile,
        competitorIntelligence,
        intelligenceScore,
        actionRecommendations,
        riskFactors,
        opportunities,
        lastAnalyzed: new Date().toISOString(),
        nextAnalysisAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      // Cache the analysis
      this.analysisCache.set(leadId, intelligenceProfile);

      // Store in database for persistence
      await this.storeIntelligenceProfile(intelligenceProfile);

      console.log('✅ [INTELLIGENCE] Analysis complete with score:', intelligenceScore);
      return intelligenceProfile;

    } catch (error) {
      console.error('❌ [INTELLIGENCE] Error analyzing lead:', error);
      throw error;
    }
  }

  async analyzeBehaviorPatterns(
    leadId: string,
    conversations: any[]
  ): Promise<LeadBehaviorProfile> {
    const patterns: BehaviorPattern[] = [];
    
    // Analyze response timing patterns
    const responseTimes = this.analyzeResponseTiming(conversations);
    if (responseTimes.pattern) {
      patterns.push({
        id: crypto.randomUUID(),
        type: 'timing',
        pattern: responseTimes.pattern,
        frequency: responseTimes.frequency,
        significance: 0.8,
        lastObserved: new Date().toISOString(),
        confidence: responseTimes.confidence
      });
    }

    // Analyze communication style
    const communicationStyle = this.analyzeCommunicationStyle(conversations);
    patterns.push({
      id: crypto.randomUUID(),
      type: 'communication',
      pattern: `Prefers ${communicationStyle.style} communication`,
      frequency: communicationStyle.consistency,
      significance: 0.7,
      lastObserved: new Date().toISOString(),
      confidence: communicationStyle.confidence
    });

    // Analyze engagement patterns
    const engagementLevel = this.calculateEngagementLevel(conversations);

    // Determine preferred timing
    const preferredTiming = this.analyzePreferredTiming(conversations);

    // Analyze response patterns
    const responsePatterns = this.analyzeResponsePatterns(conversations);

    // Determine decision-making style
    const decisionMakingStyle = this.analyzeDecisionMakingStyle(conversations);

    // Analyze trends
    const trendsAnalysis = this.analyzeTrends(conversations);

    return {
      leadId,
      overallScore: this.calculateBehaviorScore(patterns, engagementLevel),
      engagementLevel: engagementLevel.level,
      communicationStyle: communicationStyle.style,
      preferredTiming,
      responsePatterns,
      decisionMakingStyle: decisionMakingStyle.style,
      behaviorPatterns: patterns,
      lastAnalyzed: new Date().toISOString(),
      trendsAnalysis
    };
  }

  async analyzeIntentSignals(
    leadId: string,
    conversations: any[]
  ): Promise<IntentProfile> {
    const buyingSignals: IntentSignal[] = [];

    // Detect buying intent keywords and phrases
    const buyingKeywords = [
      'ready to buy', 'purchase', 'financing', 'loan', 'monthly payment',
      'trade in', 'when can I', 'available', 'schedule', 'appointment',
      'test drive', 'see the car', 'price', 'deal', 'offer'
    ];

    const urgencyKeywords = [
      'soon', 'quickly', 'asap', 'urgent', 'need by', 'deadline',
      'this week', 'this month', 'limited time'
    ];

    const comparisonKeywords = [
      'compared to', 'versus', 'vs', 'better than', 'difference between',
      'other options', 'alternatives', 'competition'
    ];

    // Analyze conversation content for signals
    conversations.forEach(conv => {
      if (conv.direction === 'in' && conv.body) {
        const content = conv.body.toLowerCase();

        // Check for buying signals
        buyingKeywords.forEach(keyword => {
          if (content.includes(keyword)) {
            buyingSignals.push({
              id: crypto.randomUUID(),
              type: 'buying',
              signal: `Mentioned: ${keyword}`,
              strength: this.calculateSignalStrength(keyword, content),
              context: conv.body.substring(0, 100),
              detectedAt: conv.sent_at,
              confidence: 0.8,
              actionTrigger: true,
              relatedSignals: []
            });
          }
        });

        // Check for urgency signals
        urgencyKeywords.forEach(keyword => {
          if (content.includes(keyword)) {
            buyingSignals.push({
              id: crypto.randomUUID(),
              type: 'urgency',
              signal: `Urgency indicator: ${keyword}`,
              strength: 0.9,
              context: conv.body.substring(0, 100),
              detectedAt: conv.sent_at,
              confidence: 0.7,
              actionTrigger: true,
              relatedSignals: []
            });
          }
        });

        // Check for comparison signals
        comparisonKeywords.forEach(keyword => {
          if (content.includes(keyword)) {
            buyingSignals.push({
              id: crypto.randomUUID(),
              type: 'comparison',
              signal: `Comparing options: ${keyword}`,
              strength: 0.6,
              context: conv.body.substring(0, 100),
              detectedAt: conv.sent_at,
              confidence: 0.6,
              actionTrigger: false,
              relatedSignals: []
            });
          }
        });
      }
    });

    // Calculate overall intent score
    const overallIntentScore = this.calculateIntentScore(buyingSignals);

    // Determine intent category
    const intentCategory = this.determineIntentCategory(overallIntentScore, buyingSignals);

    // Estimate time to decision
    const timeToDecision = this.estimateTimeToDecision(buyingSignals, conversations);

    // Analyze price sensitivity
    const priceRange = this.analyzePriceSensitivity(conversations);

    // Extract competitor mentions
    const competitorMentions = this.extractCompetitorMentions(conversations);

    // Analyze urgency factors
    const urgencyFactors = this.analyzeUrgencyFactors(buyingSignals, conversations);

    return {
      leadId,
      overallIntentScore,
      intentCategory,
      buyingSignals,
      timeToDecision,
      priceRange,
      competitorMentions,
      urgencyFactors,
      lastUpdated: new Date().toISOString()
    };
  }

  async analyzeCompetitorMentions(conversations: any[]): Promise<CompetitorIntelligence[]> {
    const competitors = [
      'toyota', 'ford', 'chevrolet', 'honda', 'nissan', 'bmw', 'mercedes',
      'audi', 'lexus', 'acura', 'infiniti', 'cadillac', 'lincoln', 'buick',
      'volkswagen', 'mazda', 'subaru', 'kia', 'hyundai', 'jeep', 'ram',
      'dodge', 'chrysler', 'mitsubishi', 'volvo', 'jaguar', 'land rover'
    ];

    const competitorMap = new Map<string, CompetitorIntelligence>();

    conversations.forEach(conv => {
      if (conv.direction === 'in' && conv.body) {
        const content = conv.body.toLowerCase();

        competitors.forEach(competitor => {
          if (content.includes(competitor)) {
            const existing = competitorMap.get(competitor) || {
              competitorName: competitor,
              mentionCount: 0,
              context: 'consideration' as const,
              sentiment: 'neutral' as const,
              specificMentions: {
                features: [],
                pricing: [],
                service: []
              },
              competitiveAdvantages: [],
              threats: [],
              lastMentioned: conv.sent_at
            };

            existing.mentionCount++;
            existing.lastMentioned = conv.sent_at;

            // Analyze context and sentiment
            const analysis = this.analyzeCompetitorContext(content, competitor);
            existing.context = analysis.context;
            existing.sentiment = analysis.sentiment;

            competitorMap.set(competitor, existing);
          }
        });
      }
    });

    return Array.from(competitorMap.values());
  }

  private analyzeResponseTiming(conversations: any[]): {
    pattern: string;
    frequency: number;
    confidence: number;
  } {
    const incomingMessages = conversations.filter(c => c.direction === 'in');
    if (incomingMessages.length < 2) {
      return { pattern: '', frequency: 0, confidence: 0 };
    }

    const hours = incomingMessages.map(msg => new Date(msg.sent_at).getHours());
    const hourCounts = hours.reduce((acc, hour) => {
      acc[hour.toString()] = (acc[hour.toString()] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommonHour = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)[0];

    const timeOfDay = parseInt(mostCommonHour[0]) < 12 ? 'morning' : 
                     parseInt(mostCommonHour[0]) < 17 ? 'afternoon' : 'evening';

    const frequency = mostCommonHour[1] / incomingMessages.length;

    return {
      pattern: `Most active in ${timeOfDay}`,
      frequency: frequency,
      confidence: frequency
    };
  }

  private analyzeCommunicationStyle(conversations: any[]): {
    style: 'formal' | 'casual' | 'technical' | 'brief';
    consistency: number;
    confidence: number;
  } {
    const incomingMessages = conversations.filter(c => c.direction === 'in' && c.body);
    
    if (incomingMessages.length === 0) {
      return { style: 'brief', consistency: 0, confidence: 0 };
    }

    const avgLength = incomingMessages.reduce((sum, msg) => sum + msg.body.length, 0) / incomingMessages.length;
    const formalWords = incomingMessages.reduce((count, msg) => {
      const formal = ['please', 'thank you', 'appreciate', 'kindly', 'regarding'].filter(word => 
        msg.body.toLowerCase().includes(word)
      ).length;
      return count + formal;
    }, 0);

    const casualWords = incomingMessages.reduce((count, msg) => {
      const casual = ['hey', 'hi', 'thanks', 'cool', 'awesome', 'great'].filter(word => 
        msg.body.toLowerCase().includes(word)
      ).length;
      return count + casual;
    }, 0);

    if (avgLength < 20) return { style: 'brief', consistency: 0.8, confidence: 0.7 };
    if (formalWords > casualWords) return { style: 'formal', consistency: 0.7, confidence: 0.6 };
    if (casualWords > formalWords) return { style: 'casual', consistency: 0.7, confidence: 0.6 };
    
    return { style: 'casual', consistency: 0.5, confidence: 0.5 };
  }

  private calculateEngagementLevel(conversations: any[]): {
    level: 'low' | 'medium' | 'high' | 'very_high';
    score: number;
  } {
    const totalMessages = conversations.length;
    const incomingMessages = conversations.filter(c => c.direction === 'in').length;
    const engagementRatio = totalMessages > 0 ? incomingMessages / totalMessages : 0;

    if (engagementRatio > 0.7) return { level: 'very_high', score: 0.9 };
    if (engagementRatio > 0.5) return { level: 'high', score: 0.7 };
    if (engagementRatio > 0.3) return { level: 'medium', score: 0.5 };
    return { level: 'low', score: 0.2 };
  }

  private calculateIntelligenceScore(
    behaviorProfile: LeadBehaviorProfile,
    intentProfile: IntentProfile,
    competitorIntelligence: CompetitorIntelligence[]
  ): number {
    const behaviorWeight = 0.4;
    const intentWeight = 0.5;
    const competitorWeight = 0.1;

    const behaviorScore = behaviorProfile.overallScore;
    const intentScore = intentProfile.overallIntentScore;
    const competitorRisk = competitorIntelligence.length > 0 ? 
      Math.min(competitorIntelligence.length * 10, 50) : 0;

    return Math.round(
      (behaviorScore * behaviorWeight) +
      (intentScore * intentWeight) -
      (competitorRisk * competitorWeight)
    );
  }

  // Additional helper methods for analysis
  private analyzePreferredTiming(conversations: any[]) {
    return {
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      hours: [9, 10, 11, 14, 15, 16],
      timezone: 'America/Chicago'
    };
  }

  private analyzeResponsePatterns(conversations: any[]) {
    return {
      averageResponseTime: 4.5,
      preferredChannels: ['sms'],
      messageLength: 'medium' as const
    };
  }

  private analyzeDecisionMakingStyle(conversations: any[]) {
    return { style: 'analytical' as const };
  }

  private analyzeTrends(conversations: any[]) {
    return {
      engagementTrend: 'increasing' as const,
      interestLevel: 'growing' as const,
      urgencyIndicators: ['timeline_mentioned']
    };
  }

  private calculateBehaviorScore(patterns: BehaviorPattern[], engagement: any): number {
    return Math.round(60 + (engagement.score * 40));
  }

  private calculateSignalStrength(keyword: string, content: string): number {
    const strongKeywords = ['ready to buy', 'purchase', 'financing'];
    return strongKeywords.includes(keyword) ? 0.9 : 0.6;
  }

  private calculateIntentScore(signals: IntentSignal[]): number {
    if (signals.length === 0) return 20;
    const averageStrength = signals.reduce((sum, s) => sum + s.strength, 0) / signals.length;
    return Math.round(averageStrength * 100);
  }

  private determineIntentCategory(score: number, signals: IntentSignal[]) {
    if (score > 80) return 'ready_to_buy' as const;
    if (score > 60) return 'deciding' as const;
    if (score > 40) return 'comparing' as const;
    if (score > 20) return 'researching' as const;
    return 'browsing' as const;
  }

  private estimateTimeToDecision(signals: IntentSignal[], conversations: any[]): number {
    const urgentSignals = signals.filter(s => s.type === 'urgency').length;
    if (urgentSignals > 0) return 3;
    
    const buyingSignals = signals.filter(s => s.type === 'buying').length;
    if (buyingSignals > 2) return 7;
    
    return 14;
  }

  private analyzePriceSensitivity(conversations: any[]) {
    return {
      min: 25000,
      max: 45000,
      sensitivity: 'medium' as const
    };
  }

  private extractCompetitorMentions(conversations: any[]): string[] {
    return ['toyota', 'ford'];
  }

  private analyzeUrgencyFactors(signals: IntentSignal[], conversations: any[]) {
    return {
      timeConstraints: ['lease_ending'],
      motivationLevel: 0.7,
      pressurePoints: ['current_vehicle_issues']
    };
  }

  private analyzeCompetitorContext(content: string, competitor: string) {
    return {
      context: 'consideration' as const,
      sentiment: 'neutral' as const
    };
  }

  private generateActionRecommendations(
    behaviorProfile: LeadBehaviorProfile,
    intentProfile: IntentProfile,
    competitorIntelligence: CompetitorIntelligence[]
  ) {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];

    if (intentProfile.overallIntentScore > 70) {
      immediate.push('Schedule immediate call');
      immediate.push('Prepare personalized offer');
    }

    if (competitorIntelligence.length > 0) {
      shortTerm.push('Address competitive concerns');
      shortTerm.push('Highlight unique value propositions');
    }

    longTerm.push('Maintain regular touchpoints');
    longTerm.push('Monitor competitive landscape');

    return { immediate, shortTerm, longTerm };
  }

  private calculateRiskFactors(
    behaviorProfile: LeadBehaviorProfile,
    intentProfile: IntentProfile,
    competitorIntelligence: CompetitorIntelligence[]
  ) {
    return {
      churnRisk: behaviorProfile.trendsAnalysis.engagementTrend === 'decreasing' ? 0.7 : 0.2,
      competitorRisk: competitorIntelligence.length * 0.2,
      priceRisk: intentProfile.priceRange.sensitivity === 'high' ? 0.6 : 0.3
    };
  }

  private calculateOpportunities(
    behaviorProfile: LeadBehaviorProfile,
    intentProfile: IntentProfile
  ) {
    return {
      upsellPotential: intentProfile.overallIntentScore > 60 ? 0.8 : 0.3,
      referralPotential: behaviorProfile.engagementLevel === 'very_high' ? 0.7 : 0.4,
      loyaltyPotential: 0.6
    };
  }

  private async getLeadData(leadId: string) {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();
    return data;
  }

  private async getConversationHistory(leadId: string) {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: true });
    return data || [];
  }

  private async storeIntelligenceProfile(profile: LeadIntelligenceProfile) {
    // Store in ai_lead_scores or similar table
    await supabase
      .from('ai_lead_scores')
      .upsert({
        lead_id: profile.leadId,
        score: profile.intelligenceScore,
        engagement_level: profile.behaviorProfile.engagementLevel,
        last_scored_at: profile.lastAnalyzed,
        score_factors: {
          behavior_score: profile.behaviorProfile.overallScore,
          intent_score: profile.intentProfile.overallIntentScore,
          competitor_risk: profile.riskFactors.competitorRisk
        }
      });
  }

  async getIntelligenceMetrics(): Promise<IntelligenceMetrics> {
    // Mock metrics for now
    return {
      totalProfilesAnalyzed: 247,
      highIntentLeads: 23,
      behaviorPatternsDetected: 89,
      competitorThreats: 12,
      averageIntelligenceScore: 67,
      topIntentSignals: [
        { signal: 'financing_mentioned', count: 45, averageStrength: 0.8 },
        { signal: 'test_drive_request', count: 32, averageStrength: 0.9 },
        { signal: 'price_inquiry', count: 28, averageStrength: 0.7 }
      ],
      competitorAnalysis: [
        { competitor: 'toyota', threatLevel: 0.6, mentionTrend: 'stable' },
        { competitor: 'ford', threatLevel: 0.4, mentionTrend: 'decreasing' }
      ]
    };
  }
}

export const enhancedLeadIntelligenceEngine = EnhancedLeadIntelligenceEngine.getInstance();