
import { supabase } from '@/integrations/supabase/client';

interface OptimizationRecommendation {
  type: 'template_adjustment' | 'timing_change' | 'personalization_update' | 'response_strategy';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  expectedImpact: number;
  implementation: string;
  testingRequired: boolean;
}

interface PerformanceMetrics {
  responseRate: number;
  conversionRate: number;
  engagementScore: number;
  averageResponseTime: number;
  customerSatisfaction: number;
}

interface OptimizationRule {
  id: string;
  name: string;
  condition: string;
  action: string;
  isActive: boolean;
  priority: number;
}

class AutomatedAIOptimizationService {
  private optimizationRules: OptimizationRule[] = [];
  private performanceBaseline: PerformanceMetrics | null = null;
  private lastOptimizationRun: Date | null = null;

  async processAutomaticOptimizations(): Promise<void> {
    try {
      console.log('🔧 [AUTO-OPT] Starting automated optimization cycle');

      // Step 1: Analyze current performance
      const currentMetrics = await this.analyzeCurrentPerformance();
      
      // Step 2: Compare against baseline
      const needsOptimization = await this.detectOptimizationOpportunities(currentMetrics);
      
      if (needsOptimization.length === 0) {
        console.log('✅ [AUTO-OPT] No optimization opportunities detected');
        return;
      }

      // Step 3: Generate optimization recommendations
      const recommendations = await this.generateOptimizationRecommendations(needsOptimization);
      
      // Step 4: Apply safe optimizations automatically
      await this.applyAutomaticOptimizations(recommendations);
      
      // Step 5: Store insights for manual review
      await this.storeOptimizationInsights(recommendations);
      
      this.lastOptimizationRun = new Date();
      console.log(`✅ [AUTO-OPT] Completed optimization cycle with ${recommendations.length} recommendations`);

    } catch (error) {
      console.error('❌ [AUTO-OPT] Error in optimization cycle:', error);
    }
  }

  private async analyzeCurrentPerformance(): Promise<PerformanceMetrics> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Get conversation data for analysis
      const { data: conversations } = await supabase
        .from('conversations')
        .select('direction, sent_at, ai_generated')
        .gte('sent_at', thirtyDaysAgo.toISOString())
        .order('sent_at', { ascending: false });

      if (!conversations || conversations.length === 0) {
        return this.getDefaultMetrics();
      }

      // Calculate response rate
      const outboundMessages = conversations.filter(c => c.direction === 'out' && c.ai_generated);
      const inboundResponses = conversations.filter(c => c.direction === 'in');
      const responseRate = inboundResponses.length / Math.max(outboundMessages.length, 1);

      // Get learning outcomes for conversion analysis
      const { data: outcomes } = await supabase
        .from('ai_learning_outcomes')
        .select('outcome_type')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const conversions = outcomes?.filter(o => 
        ['appointment_booked', 'positive_response', 'purchase_intent'].includes(o.outcome_type)
      ).length || 0;
      
      const conversionRate = conversions / Math.max(outboundMessages.length, 1);

      // Calculate engagement score based on message frequency and length
      const avgResponseTime = this.calculateAverageResponseTime(conversations);
      const engagementScore = Math.min(responseRate * 100, 100);

      const metrics: PerformanceMetrics = {
        responseRate: Math.round(responseRate * 100) / 100,
        conversionRate: Math.round(conversionRate * 100) / 100,
        engagementScore: Math.round(engagementScore),
        averageResponseTime: avgResponseTime,
        customerSatisfaction: 7.5 // Default - would come from feedback in production
      };

      // Set baseline if not exists
      if (!this.performanceBaseline) {
        this.performanceBaseline = metrics;
      }

      return metrics;

    } catch (error) {
      console.error('❌ [AUTO-OPT] Error analyzing performance:', error);
      return this.getDefaultMetrics();
    }
  }

  private calculateAverageResponseTime(conversations: any[]): number {
    const conversationPairs = [];
    
    for (let i = 0; i < conversations.length - 1; i++) {
      const current = conversations[i];
      const next = conversations[i + 1];
      
      if (current.direction === 'in' && next.direction === 'out') {
        const responseTime = new Date(next.sent_at).getTime() - new Date(current.sent_at).getTime();
        conversationPairs.push(responseTime / (1000 * 60 * 60)); // Convert to hours
      }
    }
    
    return conversationPairs.length > 0 
      ? conversationPairs.reduce((sum, time) => sum + time, 0) / conversationPairs.length 
      : 2; // Default 2 hours
  }

  private getDefaultMetrics(): PerformanceMetrics {
    return {
      responseRate: 0.3,
      conversionRate: 0.1,
      engagementScore: 50,
      averageResponseTime: 2,
      customerSatisfaction: 7
    };
  }

  private async detectOptimizationOpportunities(metrics: PerformanceMetrics): Promise<string[]> {
    const opportunities: string[] = [];
    
    if (!this.performanceBaseline) {
      return opportunities;
    }

    // Check for declining response rates
    if (metrics.responseRate < this.performanceBaseline.responseRate * 0.9) {
      opportunities.push('low_response_rate');
    }

    // Check for slow response times
    if (metrics.averageResponseTime > 4) {
      opportunities.push('slow_response_time');
    }

    // Check for low engagement
    if (metrics.engagementScore < 40) {
      opportunities.push('low_engagement');
    }

    // Check for low conversion rates
    if (metrics.conversionRate < this.performanceBaseline.conversionRate * 0.8) {
      opportunities.push('low_conversion');
    }

    return opportunities;
  }

  private async generateOptimizationRecommendations(opportunities: string[]): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    for (const opportunity of opportunities) {
      switch (opportunity) {
        case 'low_response_rate':
          recommendations.push({
            type: 'template_adjustment',
            priority: 'high',
            description: 'Response rates have declined. Consider adjusting message templates to be more engaging.',
            expectedImpact: 0.15,
            implementation: 'Update message templates with more personalized and engaging content',
            testingRequired: true
          });
          break;

        case 'slow_response_time':
          recommendations.push({
            type: 'timing_change',
            priority: 'medium',
            description: 'Response times are slower than optimal. Consider adjusting AI trigger timing.',
            expectedImpact: 0.1,
            implementation: 'Reduce AI response delay and optimize scheduling',
            testingRequired: false
          });
          break;

        case 'low_engagement':
          recommendations.push({
            type: 'personalization_update',
            priority: 'high',
            description: 'Engagement scores are low. Increase personalization depth.',
            expectedImpact: 0.2,
            implementation: 'Enhance personalization engine with more customer data points',
            testingRequired: true
          });
          break;

        case 'low_conversion':
          recommendations.push({
            type: 'response_strategy',
            priority: 'critical',
            description: 'Conversion rates have dropped significantly. Review response strategy.',
            expectedImpact: 0.25,
            implementation: 'Analyze successful conversation patterns and adapt strategy',
            testingRequired: true
          });
          break;
      }
    }

    return recommendations;
  }

  private async applyAutomaticOptimizations(recommendations: OptimizationRecommendation[]): Promise<void> {
    const safeOptimizations = recommendations.filter(r => !r.testingRequired && r.priority !== 'critical');

    for (const optimization of safeOptimizations) {
      try {
        await this.implementOptimization(optimization);
        console.log(`✅ [AUTO-OPT] Applied optimization: ${optimization.description}`);
      } catch (error) {
        console.error(`❌ [AUTO-OPT] Failed to apply optimization: ${optimization.description}`, error);
      }
    }
  }

  private async implementOptimization(optimization: OptimizationRecommendation): Promise<void> {
    switch (optimization.type) {
      case 'timing_change':
        // Adjust AI scheduling parameters
        await this.optimizeSchedulingParameters();
        break;

      case 'template_adjustment':
        // Update template performance scores
        await this.updateTemplatePerformance();
        break;

      default:
        console.log(`[AUTO-OPT] Optimization type ${optimization.type} requires manual implementation`);
        break;
    }
  }

  private async optimizeSchedulingParameters(): Promise<void> {
    try {
      // Update AI schedule config to be more responsive
      const { data: configs } = await supabase
        .from('ai_schedule_config')
        .select('*')
        .eq('is_active', true);

      if (configs) {
        for (const config of configs) {
          // Reduce day offset for faster responses
          const newOffset = Math.max(config.day_offset - 1, 0);
          
          await supabase
            .from('ai_schedule_config')
            .update({ 
              day_offset: newOffset,
              updated_at: new Date().toISOString()
            })
            .eq('id', config.id);
        }
      }
    } catch (error) {
      console.error('❌ [AUTO-OPT] Error optimizing scheduling:', error);
    }
  }

  private async updateTemplatePerformance(): Promise<void> {
    try {
      // Analyze recent template performance and boost high-performing ones
      const { data: templates } = await supabase
        .from('ai_template_performance')
        .select('*')
        .gte('last_used_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('response_rate', { ascending: false });

      if (templates && templates.length > 0) {
        const topPerformer = templates[0];
        
        // Boost performance score of top performer
        await supabase
          .from('ai_template_performance')
          .update({
            performance_score: Math.min(topPerformer.performance_score + 0.1, 1.0),
            updated_at: new Date().toISOString()
          })
          .eq('id', topPerformer.id);
      }
    } catch (error) {
      console.error('❌ [AUTO-OPT] Error updating template performance:', error);
    }
  }

  private async storeOptimizationInsights(recommendations: OptimizationRecommendation[]): Promise<void> {
    try {
      for (const recommendation of recommendations) {
        // Serialize the recommendation properly for database storage
        const insightData = {
          recommendation: {
            type: recommendation.type,
            priority: recommendation.priority,
            description: recommendation.description,
            expectedImpact: recommendation.expectedImpact,
            implementation: recommendation.implementation,
            testingRequired: recommendation.testingRequired
          },
          action: 'optimization_recommended',
          timestamp: new Date().toISOString()
        };

        await supabase
          .from('ai_learning_insights')
          .insert({
            insight_type: 'automated_optimization',
            insight_title: `Optimization: ${recommendation.type}`,
            insight_description: recommendation.description,
            insight_data: insightData as any,
            confidence_score: recommendation.expectedImpact,
            impact_level: recommendation.priority,
            actionable: true,
            applies_globally: true
          });
      }
    } catch (error) {
      console.error('❌ [AUTO-OPT] Error storing optimization insights:', error);
    }
  }

  async getOptimizationStatus(): Promise<any> {
    try {
      const currentMetrics = await this.analyzeCurrentPerformance();
      const recentInsights = await this.getRecentOptimizationInsights();

      return {
        currentPerformance: currentMetrics,
        baseline: this.performanceBaseline,
        lastOptimizationRun: this.lastOptimizationRun,
        activeOptimizations: recentInsights.length,
        optimizationHealth: this.calculateOptimizationHealth(currentMetrics),
        recommendations: recentInsights.slice(0, 3)
      };

    } catch (error) {
      console.error('❌ [AUTO-OPT] Error getting optimization status:', error);
      return {
        currentPerformance: this.getDefaultMetrics(),
        baseline: null,
        lastOptimizationRun: null,
        activeOptimizations: 0,
        optimizationHealth: 'unknown',
        recommendations: []
      };
    }
  }

  private async getRecentOptimizationInsights(): Promise<any[]> {
    try {
      const { data: insights } = await supabase
        .from('ai_learning_insights')
        .select('*')
        .eq('insight_type', 'automated_optimization')
        .eq('actionable', true)
        .order('created_at', { ascending: false })
        .limit(10);

      return insights || [];
    } catch (error) {
      console.error('❌ [AUTO-OPT] Error getting recent insights:', error);
      return [];
    }
  }

  private calculateOptimizationHealth(metrics: PerformanceMetrics): string {
    if (!this.performanceBaseline) return 'baseline_needed';

    const responseImprovement = metrics.responseRate / this.performanceBaseline.responseRate;
    const conversionImprovement = metrics.conversionRate / this.performanceBaseline.conversionRate;
    const engagementImprovement = metrics.engagementScore / this.performanceBaseline.engagementScore;

    const avgImprovement = (responseImprovement + conversionImprovement + engagementImprovement) / 3;

    if (avgImprovement >= 1.1) return 'excellent';
    if (avgImprovement >= 1.05) return 'good';
    if (avgImprovement >= 0.95) return 'stable';
    if (avgImprovement >= 0.9) return 'declining';
    
    return 'needs_attention';
  }

  async triggerManualOptimization(optimizationType: string): Promise<void> {
    try {
      console.log(`🔧 [AUTO-OPT] Triggering manual optimization: ${optimizationType}`);

      const currentMetrics = await this.analyzeCurrentPerformance();
      const opportunities = [optimizationType];
      const recommendations = await this.generateOptimizationRecommendations(opportunities);

      await this.storeOptimizationInsights(recommendations);
      
      console.log(`✅ [AUTO-OPT] Manual optimization triggered for: ${optimizationType}`);

    } catch (error) {
      console.error('❌ [AUTO-OPT] Error triggering manual optimization:', error);
    }
  }
}

export const automatedAIOptimization = new AutomatedAIOptimizationService();
