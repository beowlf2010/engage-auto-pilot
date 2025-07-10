import { supabase } from '@/integrations/supabase/client';
import type { CompetitorIntelligence } from '@/types/leadIntelligence';

export interface CompetitorThreat {
  id: string;
  competitorName: string;
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  mentionFrequency: number;
  sentimentTrend: 'improving' | 'stable' | 'declining';
  keyMentions: Array<{
    message: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    timestamp: string;
    context: string;
  }>;
  threatIndicators: string[];
  recommendations: string[];
  lastUpdated: string;
}

export interface CounterStrategy {
  competitorName: string;
  strategies: Array<{
    type: 'pricing' | 'features' | 'service' | 'messaging';
    action: string;
    priority: 'high' | 'medium' | 'low';
    expectedImpact: string;
    implementation: string;
  }>;
  competitiveAdvantages: string[];
  weaknesses: string[];
  recommendedTalkingPoints: string[];
}

export interface CompetitiveLandscape {
  totalCompetitors: number;
  activeThreat: number;
  marketPosition: 'leader' | 'challenger' | 'follower';
  competitiveStrength: number;
  threatSummary: {
    immediate: CompetitorThreat[];
    emerging: CompetitorThreat[];
    monitored: CompetitorThreat[];
  };
}

class CompetitiveIntelligenceService {
  private static instance: CompetitiveIntelligenceService;
  private competitorDatabase = new Map<string, any>();
  private sentimentPatterns = new Map<string, any>();

  static getInstance(): CompetitiveIntelligenceService {
    if (!CompetitiveIntelligenceService.instance) {
      CompetitiveIntelligenceService.instance = new CompetitiveIntelligenceService();
    }
    return CompetitiveIntelligenceService.instance;
  }

  async analyzeCompetitorMentions(leadId: string): Promise<CompetitorIntelligence[]> {
    console.log('🎯 [COMPETITIVE] Starting competitor analysis for lead:', leadId);

    try {
      // Get conversation history
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: true });

      if (!conversations || conversations.length === 0) {
        return [];
      }

      const competitorMentions = this.detectCompetitorMentions(conversations);
      const enhancedIntelligence = await Promise.all(
        competitorMentions.map(mention => this.enhanceCompetitorIntelligence(mention, conversations))
      );

      console.log(`✅ [COMPETITIVE] Found ${enhancedIntelligence.length} competitor mentions`);
      return enhancedIntelligence;

    } catch (error) {
      console.error('❌ [COMPETITIVE] Error analyzing competitors:', error);
      return [];
    }
  }

  async generateThreatAssessment(leadId?: string): Promise<CompetitiveLandscape> {
    console.log('🚨 [COMPETITIVE] Generating threat assessment');

    try {
      const { data: recentConversations } = await supabase
        .from('conversations')
        .select('*')
        .gte('sent_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('sent_at', { ascending: false });

      const allCompetitors = this.detectCompetitorMentions(recentConversations || []);
      const threats = await this.assessCompetitorThreats(allCompetitors);

      const landscape: CompetitiveLandscape = {
        totalCompetitors: allCompetitors.length,
        activeThreat: threats.filter(t => t.threatLevel === 'high' || t.threatLevel === 'critical').length,
        marketPosition: this.determineMarketPosition(threats),
        competitiveStrength: this.calculateCompetitiveStrength(threats),
        threatSummary: {
          immediate: threats.filter(t => t.threatLevel === 'critical'),
          emerging: threats.filter(t => t.threatLevel === 'high'),
          monitored: threats.filter(t => t.threatLevel === 'medium' || t.threatLevel === 'low')
        }
      };

      return landscape;

    } catch (error) {
      console.error('❌ [COMPETITIVE] Error generating threat assessment:', error);
      return {
        totalCompetitors: 0,
        activeThreat: 0,
        marketPosition: 'follower',
        competitiveStrength: 0,
        threatSummary: { immediate: [], emerging: [], monitored: [] }
      };
    }
  }

  async generateCounterStrategies(competitorThreats: CompetitorThreat[]): Promise<CounterStrategy[]> {
    console.log('⚔️ [COMPETITIVE] Generating counter-strategies');

    return competitorThreats.map(threat => {
      const strategies = this.generateStrategiesForCompetitor(threat);
      const advantages = this.identifyCompetitiveAdvantages(threat.competitorName);
      const weaknesses = this.identifyCompetitorWeaknesses(threat.competitorName);
      const talkingPoints = this.generateTalkingPoints(threat.competitorName, advantages);

      return {
        competitorName: threat.competitorName,
        strategies,
        competitiveAdvantages: advantages,
        weaknesses,
        recommendedTalkingPoints: talkingPoints
      };
    });
  }

  private detectCompetitorMentions(conversations: any[]): CompetitorIntelligence[] {
    const competitors = [
      { name: 'toyota', aliases: ['toyota', 'camry', 'corolla', 'rav4', 'highlander', 'prius'] },
      { name: 'ford', aliases: ['ford', 'f-150', 'escape', 'explorer', 'fusion', 'mustang'] },
      { name: 'chevrolet', aliases: ['chevrolet', 'chevy', 'silverado', 'equinox', 'malibu', 'tahoe'] },
      { name: 'honda', aliases: ['honda', 'civic', 'accord', 'cr-v', 'pilot', 'odyssey'] },
      { name: 'nissan', aliases: ['nissan', 'sentra', 'altima', 'rogue', 'pathfinder', 'titan'] },
      { name: 'bmw', aliases: ['bmw', '3 series', '5 series', 'x3', 'x5'] },
      { name: 'mercedes', aliases: ['mercedes', 'mercedes-benz', 'c-class', 'e-class', 'glc'] },
      { name: 'audi', aliases: ['audi', 'a4', 'a6', 'q5', 'q7'] },
      { name: 'lexus', aliases: ['lexus', 'es', 'rx', 'gx', 'lx'] },
      { name: 'acura', aliases: ['acura', 'tlx', 'mdx', 'rdx'] }
    ];

    const mentionMap = new Map<string, CompetitorIntelligence>();

    conversations.forEach(conv => {
      if (conv.direction === 'in' && conv.body) {
        const content = conv.body.toLowerCase();

        competitors.forEach(competitor => {
          const mentioned = competitor.aliases.some(alias => content.includes(alias.toLowerCase()));
          
          if (mentioned) {
            const existing = mentionMap.get(competitor.name) || {
              competitorName: competitor.name,
              mentionCount: 0,
              context: 'consideration' as const,
              sentiment: 'neutral' as const,
              specificMentions: { features: [], pricing: [], service: [] },
              competitiveAdvantages: [],
              threats: [],
              lastMentioned: conv.sent_at
            };

            existing.mentionCount++;
            existing.lastMentioned = conv.sent_at;

            // Analyze context and sentiment
            const analysis = this.analyzeCompetitorContext(content, competitor.name);
            existing.context = analysis.context;
            existing.sentiment = analysis.sentiment;

            // Extract specific mentions
            this.extractSpecificMentions(content, existing);

            mentionMap.set(competitor.name, existing);
          }
        });
      }
    });

    return Array.from(mentionMap.values());
  }

  private async enhanceCompetitorIntelligence(
    mention: CompetitorIntelligence,
    conversations: any[]
  ): Promise<CompetitorIntelligence> {
    // Enhance with threat analysis
    const threats = this.identifyThreats(mention, conversations);
    const advantages = this.identifyCompetitiveAdvantages(mention.competitorName);

    return {
      ...mention,
      threats,
      competitiveAdvantages: advantages
    };
  }

  private analyzeCompetitorContext(content: string, competitor: string) {
    // Analyze sentiment
    const positiveWords = ['better', 'prefer', 'like', 'love', 'great', 'excellent', 'amazing'];
    const negativeWords = ['worse', 'hate', 'dislike', 'terrible', 'awful', 'bad', 'poor'];
    const comparisonWords = ['versus', 'vs', 'compared to', 'better than', 'worse than'];

    const positiveCount = positiveWords.filter(word => content.includes(word)).length;
    const negativeCount = negativeWords.filter(word => content.includes(word)).length;
    const comparisonCount = comparisonWords.filter(word => content.includes(word)).length;

    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (positiveCount > negativeCount) sentiment = 'positive';
    else if (negativeCount > positiveCount) sentiment = 'negative';

    let context: 'comparison' | 'preference' | 'consideration' | 'rejection' = 'consideration';
    if (comparisonCount > 0) context = 'comparison';
    else if (positiveCount > 0 && sentiment === 'positive') context = 'preference';
    else if (negativeCount > 0 && sentiment === 'negative') context = 'rejection';

    return { context, sentiment };
  }

  private extractSpecificMentions(content: string, mention: CompetitorIntelligence) {
    // Feature mentions
    const featureKeywords = ['features', 'technology', 'safety', 'performance', 'fuel economy', 'interior', 'exterior'];
    featureKeywords.forEach(keyword => {
      if (content.includes(keyword)) {
        mention.specificMentions.features.push(keyword);
      }
    });

    // Pricing mentions
    const pricingKeywords = ['price', 'cost', 'expensive', 'cheap', 'affordable', 'deal', 'financing'];
    pricingKeywords.forEach(keyword => {
      if (content.includes(keyword)) {
        mention.specificMentions.pricing.push(keyword);
      }
    });

    // Service mentions
    const serviceKeywords = ['service', 'dealer', 'support', 'warranty', 'maintenance'];
    serviceKeywords.forEach(keyword => {
      if (content.includes(keyword)) {
        mention.specificMentions.service.push(keyword);
      }
    });
  }

  private identifyThreats(mention: CompetitorIntelligence, conversations: any[]): string[] {
    const threats: string[] = [];

    if (mention.sentiment === 'positive') {
      threats.push('Customer preference for competitor');
    }

    if (mention.context === 'comparison') {
      threats.push('Active comparison shopping');
    }

    if (mention.specificMentions.pricing.length > 0) {
      threats.push('Price sensitivity and comparison');
    }

    if (mention.mentionCount > 3) {
      threats.push('High competitor engagement');
    }

    return threats;
  }

  private identifyCompetitiveAdvantages(competitor: string): string[] {
    const advantages: Record<string, string[]> = {
      'toyota': ['Reliability reputation', 'Fuel efficiency', 'Resale value'],
      'ford': ['American heritage', 'Truck leadership', 'Technology innovation'],
      'chevrolet': ['Value proposition', 'Performance options', 'Warranty coverage'],
      'honda': ['Reliability', 'Fuel economy', 'Practical design'],
      'nissan': ['CVT transmission', 'Design innovation', 'Value pricing'],
      'bmw': ['Luxury positioning', 'Performance heritage', 'Technology leadership'],
      'mercedes': ['Luxury status', 'Safety innovation', 'Build quality'],
      'audi': ['Design excellence', 'Technology integration', 'Performance'],
      'lexus': ['Luxury reliability', 'Customer service', 'Quiet operation'],
      'acura': ['Performance luxury', 'Technology features', 'Value positioning']
    };

    return advantages[competitor] || ['Market presence', 'Brand recognition'];
  }

  private identifyCompetitorWeaknesses(competitor: string): string[] {
    const weaknesses: Record<string, string[]> = {
      'toyota': ['Higher initial cost', 'Conservative styling'],
      'ford': ['Reliability concerns', 'Higher maintenance costs'],
      'chevrolet': ['Perceived quality issues', 'Resale value concerns'],
      'honda': ['CVT reliability', 'Road noise issues'],
      'nissan': ['CVT problems', 'Interior quality'],
      'bmw': ['High maintenance costs', 'Complexity issues'],
      'mercedes': ['Expensive repairs', 'Depreciation'],
      'audi': ['Maintenance costs', 'Electrical issues'],
      'lexus': ['Higher pricing', 'Limited performance options'],
      'acura': ['Brand perception', 'Limited dealer network']
    };

    return weaknesses[competitor] || ['Limited advantages'];
  }

  private async assessCompetitorThreats(competitors: CompetitorIntelligence[]): Promise<CompetitorThreat[]> {
    return competitors.map(comp => {
      const riskScore = this.calculateRiskScore(comp);
      const threatLevel = this.determineThreatLevel(riskScore);

      return {
        id: crypto.randomUUID(),
        competitorName: comp.competitorName,
        threatLevel,
        riskScore,
        mentionFrequency: comp.mentionCount,
        sentimentTrend: 'stable',
        keyMentions: [],
        threatIndicators: comp.threats,
        recommendations: this.generateThreatRecommendations(comp),
        lastUpdated: new Date().toISOString()
      };
    });
  }

  private calculateRiskScore(competitor: CompetitorIntelligence): number {
    let score = 0;

    // Base score from mention frequency
    score += Math.min(competitor.mentionCount * 10, 40);

    // Sentiment impact
    if (competitor.sentiment === 'positive') score += 30;
    else if (competitor.sentiment === 'negative') score -= 10;

    // Context impact
    if (competitor.context === 'preference') score += 25;
    else if (competitor.context === 'comparison') score += 15;

    // Threat factors
    score += competitor.threats.length * 5;

    return Math.min(Math.max(score, 0), 100);
  }

  private determineThreatLevel(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore >= 80) return 'critical';
    if (riskScore >= 60) return 'high';
    if (riskScore >= 30) return 'medium';
    return 'low';
  }

  private generateThreatRecommendations(competitor: CompetitorIntelligence): string[] {
    const recommendations: string[] = [];

    if (competitor.sentiment === 'positive') {
      recommendations.push('Address customer concerns about our advantages');
      recommendations.push('Highlight unique value propositions');
    }

    if (competitor.context === 'comparison') {
      recommendations.push('Provide detailed comparison materials');
      recommendations.push('Schedule competitive demonstration');
    }

    if (competitor.specificMentions.pricing.length > 0) {
      recommendations.push('Review pricing strategy');
      recommendations.push('Emphasize total value proposition');
    }

    return recommendations;
  }

  private generateStrategiesForCompetitor(threat: CompetitorThreat) {
    const strategies = [];

    if (threat.threatLevel === 'critical' || threat.threatLevel === 'high') {
      strategies.push({
        type: 'messaging' as const,
        action: 'Implement aggressive counter-messaging',
        priority: 'high' as const,
        expectedImpact: 'Reduce competitor preference',
        implementation: 'Train sales team on competitive advantages'
      });

      strategies.push({
        type: 'pricing' as const,
        action: 'Review competitive pricing',
        priority: 'high' as const,
        expectedImpact: 'Improve price competitiveness',
        implementation: 'Adjust pricing strategy or incentives'
      });
    }

    strategies.push({
      type: 'features' as const,
      action: 'Highlight unique features',
      priority: 'medium' as const,
      expectedImpact: 'Differentiate from competitor',
      implementation: 'Create feature comparison materials'
    });

    return strategies;
  }

  private generateTalkingPoints(competitor: string, advantages: string[]): string[] {
    return [
      `While ${competitor} is a good choice, our advantage is...`,
      ...advantages.map(adv => `We excel in ${adv.toLowerCase()}`),
      'Let me show you our unique value proposition',
      'Have you considered these additional benefits?'
    ];
  }

  private determineMarketPosition(threats: CompetitorThreat[]): 'leader' | 'challenger' | 'follower' {
    const avgThreatLevel = threats.reduce((sum, t) => sum + t.riskScore, 0) / Math.max(threats.length, 1);
    
    if (avgThreatLevel < 30) return 'leader';
    if (avgThreatLevel < 60) return 'challenger';
    return 'follower';
  }

  private calculateCompetitiveStrength(threats: CompetitorThreat[]): number {
    const maxThreat = Math.max(...threats.map(t => t.riskScore), 0);
    return Math.max(100 - maxThreat, 0);
  }

  async getCompetitiveDashboardData() {
    try {
      const landscape = await this.generateThreatAssessment();
      const counterStrategies = await this.generateCounterStrategies(
        [...landscape.threatSummary.immediate, ...landscape.threatSummary.emerging]
      );

      return {
        landscape,
        counterStrategies,
        metrics: {
          totalThreats: landscape.totalCompetitors,
          activeThreats: landscape.activeThreat,
          competitiveStrength: landscape.competitiveStrength,
          marketPosition: landscape.marketPosition
        }
      };
    } catch (error) {
      console.error('Error getting competitive dashboard data:', error);
      return {
        landscape: {
          totalCompetitors: 0,
          activeThreat: 0,
          marketPosition: 'follower' as const,
          competitiveStrength: 0,
          threatSummary: { immediate: [], emerging: [], monitored: [] }
        },
        counterStrategies: [],
        metrics: {
          totalThreats: 0,
          activeThreats: 0,
          competitiveStrength: 0,
          marketPosition: 'follower' as const
        }
      };
    }
  }
}

export const competitiveIntelligenceService = CompetitiveIntelligenceService.getInstance();