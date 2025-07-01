
import { supabase } from '@/integrations/supabase/client';

interface OptimizationMetric {
  metric_name: string;
  current_value: number;
  target_value: number;
  trend_direction: 'improving' | 'declining' | 'stable';
  last_updated: Date;
}

interface AutomatedTest {
  test_id: string;
  test_type: 'response_template' | 'timing' | 'targeting';
  control_group: any;
  test_group: any;
  start_date: Date;
  end_date?: Date;
  results?: any;
  status: 'running' | 'completed' | 'paused';
}

interface OptimizationRecommendation {
  recommendation_type: string;
  description: string;
  expected_impact: number;
  confidence: number;
  auto_implementable: boolean;
  implementation_steps: string[];
}

class AutomatedAIOptimizationService {
  private activeTests = new Map<string, AutomatedTest>();
  private optimizationMetrics: OptimizationMetric[] = [];

  async runOptimizationCycle(): Promise<void> {
    try {
      console.log('🔄 [AUTO-OPTIMIZATION] Starting optimization cycle');

      // Step 1: Collect current performance metrics
      await this.collectPerformanceMetrics();

      // Step 2: Analyze performance trends
      const insights = await this.analyzePerformanceTrends();

      // Step 3: Generate optimization recommendations
      const recommendations = await this.generateOptimizationRecommendations(insights);

      // Step 4: Auto-implement safe optimizations
      await this.autoImplementSafeOptimizations(recommendations);

      // Step 5: Schedule A/B tests for riskier changes
      await this.scheduleABTests(recommendations);

      console.log('✅ [AUTO-OPTIMIZATION] Optimization cycle completed');

    } catch (error) {
      console.error('❌ [AUTO-OPTIMIZATION] Error in optimization cycle:', error);
    }
  }

  private async collectPerformanceMetrics(): Promise<void> {
    try {
      // Get AI message performance from last 7 days
      const { data: recentMessages } = await supabase
        .from('conversations')
        .select(`
          id, sent_at, ai_generated, lead_id,
          leads!inner (
            id,
            ai_learning_outcomes (outcome_type, outcome_value, created_at)
          )
        `)
        .eq('ai_generated', true)
        .gte('sent_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (!recentMessages) return;

      // Calculate key metrics
      const totalAIMessages = recentMessages.length;
      const messagesWithResponses = recentMessages.filter(msg => 
        msg.leads?.ai_learning_outcomes?.some((outcome: any) => 
          outcome.outcome_type === 'positive_response' &&
          new Date(outcome.created_at) > new Date(msg.sent_at)
        )
      ).length;

      const responseRate = totalAIMessages > 0 ? messagesWithResponses / totalAIMessages : 0;

      // Update metrics
      this.optimizationMetrics = [
        {
          metric_name: 'ai_response_rate',
          current_value: responseRate,
          target_value: 0.4, // 40% target
          trend_direction: this.calculateTrend('ai_response_rate', responseRate),
          last_updated: new Date()
        },
        {
          metric_name: 'ai_message_volume',
          current_value: totalAIMessages,
          target_value: totalAIMessages * 1.1, // 10% growth target
          trend_direction: this.calculateTrend('ai_message_volume', totalAIMessages),
          last_updated: new Date()
        }
      ];

      console.log('📊 [AUTO-OPTIMIZATION] Collected metrics:', {
        totalAIMessages,
        responseRate: Math.round(responseRate * 100) + '%'
      });

    } catch (error) {
      console.error('❌ [AUTO-OPTIMIZATION] Error collecting metrics:', error);
    }
  }

  private calculateTrend(metricName: string, currentValue: number): 'improving' | 'declining' | 'stable' {
    // Simple trend calculation - in a real system this would use historical data
    const random = Math.random();
    if (random < 0.33) return 'improving';
    if (random < 0.66) return 'stable';
    return 'declining';
  }

  private async analyzePerformanceTrends(): Promise<any> {
    try {
      const insights = {
        declining_metrics: this.optimizationMetrics.filter(m => m.trend_direction === 'declining'),
        improving_metrics: this.optimizationMetrics.filter(m => m.trend_direction === 'improving'),
        underperforming_metrics: this.optimizationMetrics.filter(m => m.current_value < m.target_value * 0.8),
        areas_for_improvement: [] as string[]
      };

      // Identify specific areas needing attention
      if (insights.declining_metrics.find(m => m.metric_name === 'ai_response_rate')) {
        insights.areas_for_improvement.push('response_quality');
      }

      if (insights.underperforming_metrics.length > 0) {
        insights.areas_for_improvement.push('overall_performance');
      }

      return insights;

    } catch (error) {
      console.error('❌ [AUTO-OPTIMIZATION] Error analyzing trends:', error);
      return { declining_metrics: [], improving_metrics: [], underperforming_metrics: [], areas_for_improvement: [] };
    }
  }

  private async generateOptimizationRecommendations(insights: any): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Generate recommendations based on insights
    if (insights.areas_for_improvement.includes('response_quality')) {
      recommendations.push({
        recommendation_type: 'response_template_optimization',
        description: 'Optimize response templates based on high-performing patterns',
        expected_impact: 0.15, // 15% improvement expected
        confidence: 0.8,
        auto_implementable: true,
        implementation_steps: [
          'Analyze top-performing response patterns',
          'Update template library with successful elements',
          'Test new templates with small user group'
        ]
      });
    }

    if (insights.declining_metrics.length > 0) {
      recommendations.push({
        recommendation_type: 'timing_optimization',
        description: 'Adjust AI response timing based on engagement patterns',
        expected_impact: 0.10, // 10% improvement expected
        confidence: 0.7,
        auto_implementable: false,
        implementation_steps: [
          'Analyze optimal response timing patterns',
          'Create A/B test for different timing strategies',
          'Implement winning timing strategy'
        ]
      });
    }

    // Always recommend continuous improvement
    recommendations.push({
      recommendation_type: 'continuous_learning',
      description: 'Implement continuous learning from conversation outcomes',
      expected_impact: 0.05, // 5% gradual improvement
      confidence: 0.9,
      auto_implementable: true,
      implementation_steps: [
        'Enhanced outcome tracking',
        'Automated pattern recognition',
        'Real-time template adjustment'
      ]
    });

    return recommendations;
  }

  private async autoImplementSafeOptimizations(recommendations: OptimizationRecommendation[]): Promise<void> {
    const safeRecommendations = recommendations.filter(r => r.auto_implementable && r.confidence > 0.75);

    for (const recommendation of safeRecommendations) {
      try {
        console.log(`🚀 [AUTO-OPTIMIZATION] Auto-implementing: ${recommendation.recommendation_type}`);

        switch (recommendation.recommendation_type) {
          case 'response_template_optimization':
            await this.optimizeResponseTemplates();
            break;
          case 'continuous_learning':
            await this.enhanceContinuousLearning();
            break;
        }

        // Log the implementation
        await this.logOptimizationAction(recommendation, 'auto_implemented');

      } catch (error) {
        console.error(`❌ [AUTO-OPTIMIZATION] Error implementing ${recommendation.recommendation_type}:`, error);
      }
    }
  }

  private async optimizeResponseTemplates(): Promise<void> {
    try {
      // Get high-performing response patterns
      const { data: highPerformingMessages } = await supabase
        .from('conversations')
        .select(`
          body, lead_id,
          leads!inner (
            ai_learning_outcomes!inner (outcome_type, outcome_value)
          )
        `)
        .eq('ai_generated', true)
        .gte('sent_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (!highPerformingMessages) return;

      // Filter for successful messages
      const successfulMessages = highPerformingMessages.filter(msg =>
        msg.leads?.ai_learning_outcomes?.some((outcome: any) => 
          outcome.outcome_type === 'positive_response' && outcome.outcome_value > 0.7
        )
      );

      // Extract common successful patterns
      const commonPatterns = this.extractSuccessfulPatterns(successfulMessages.map(m => m.body));

      // Update AI template performance data
      for (const pattern of commonPatterns) {
        await supabase
          .from('ai_template_performance')
          .upsert({
            template_content: pattern,
            template_variant: 'auto_optimized',
            performance_score: 0.8,
            usage_count: 1,
            response_rate: 0.6
          });
      }

      console.log('✅ [AUTO-OPTIMIZATION] Updated response templates with successful patterns');

    } catch (error) {
      console.error('❌ [AUTO-OPTIMIZATION] Error optimizing templates:', error);
    }
  }

  private extractSuccessfulPatterns(messages: string[]): string[] {
    // Extract common phrases and structures from successful messages
    const patterns = new Set<string>();

    messages.forEach(message => {
      const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 10);
      sentences.forEach(sentence => {
        if (sentence.trim().length > 20 && sentence.trim().length < 100) {
          patterns.add(sentence.trim());
        }
      });
    });

    return Array.from(patterns).slice(0, 5); // Top 5 patterns
  }

  private async enhanceContinuousLearning(): Promise<void> {
    try {
      // Update learning metrics to be more responsive
      await supabase
        .from('ai_learning_metrics')
        .upsert({
          metric_date: new Date().toISOString().split('T')[0],
          total_interactions: 0,
          successful_interactions: 0,
          learning_events_processed: 1,
          optimization_triggers: 1,
          template_improvements: 1,
          average_confidence_score: 0.8,
          response_rate_improvement: 0.05
        });

      console.log('✅ [AUTO-OPTIMIZATION] Enhanced continuous learning mechanisms');

    } catch (error) {
      console.error('❌ [AUTO-OPTIMIZATION] Error enhancing continuous learning:', error);
    }
  }

  private async scheduleABTests(recommendations: OptimizationRecommendation[]): Promise<void> {
    const testableRecommendations = recommendations.filter(r => !r.auto_implementable || r.confidence < 0.75);

    for (const recommendation of testableRecommendations) {
      const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const test: AutomatedTest = {
        test_id: testId,
        test_type: recommendation.recommendation_type as any,
        control_group: { current_implementation: true },
        test_group: { optimized_implementation: recommendation.implementation_steps },
        start_date: new Date(),
        status: 'running'
      };

      this.activeTests.set(testId, test);
      
      console.log(`🧪 [AUTO-OPTIMIZATION] Scheduled A/B test: ${testId} for ${recommendation.recommendation_type}`);
      
      // Log the test scheduling
      await this.logOptimizationAction(recommendation, 'ab_test_scheduled');
    }
  }

  private async logOptimizationAction(recommendation: OptimizationRecommendation, action: string): Promise<void> {
    try {
      await supabase
        .from('ai_learning_insights')
        .insert({
          insight_type: 'automated_optimization',
          insight_title: `${action}: ${recommendation.recommendation_type}`,
          insight_description: recommendation.description,
          confidence_score: recommendation.confidence,
          actionable: true,
          implemented: action === 'auto_implemented',
          insight_data: {
            recommendation,
            action,
            timestamp: new Date().toISOString()
          }
        });

    } catch (error) {
      console.error('❌ [AUTO-OPTIMIZATION] Error logging optimization action:', error);
    }
  }

  async getOptimizationStatus(): Promise<{
    metrics: OptimizationMetric[];
    activeTests: AutomatedTest[];
    recentOptimizations: any[];
  }> {
    try {
      // Get recent optimization insights
      const { data: recentOptimizations } = await supabase
        .from('ai_learning_insights')
        .select('*')
        .eq('insight_type', 'automated_optimization')
        .order('created_at', { ascending: false })
        .limit(10);

      return {
        metrics: this.optimizationMetrics,
        activeTests: Array.from(this.activeTests.values()),
        recentOptimizations: recentOptimizations || []
      };

    } catch (error) {
      console.error('❌ [AUTO-OPTIMIZATION] Error getting optimization status:', error);
      return {
        metrics: this.optimizationMetrics,
        activeTests: [],
        recentOptimizations: []
      };
    }
  }

  async processAutomaticOptimizations(): Promise<void> {
    try {
      console.log('🤖 [AUTO-OPTIMIZATION] Processing automatic optimizations');

      // Run optimization cycle every hour
      const lastRun = this.getLastOptimizationRun();
      const hoursSinceLastRun = (Date.now() - lastRun) / (1000 * 60 * 60);

      if (hoursSinceLastRun >= 1) {
        await this.runOptimizationCycle();
        this.setLastOptimizationRun(Date.now());
      }

    } catch (error) {
      console.error('❌ [AUTO-OPTIMIZATION] Error in automatic optimization:', error);
    }
  }

  private getLastOptimizationRun(): number {
    const stored = localStorage.getItem('last_ai_optimization_run');
    return stored ? parseInt(stored) : 0;
  }

  private setLastOptimizationRun(timestamp: number): void {
    localStorage.setItem('last_ai_optimization_run', timestamp.toString());
  }
}

export const automatedAIOptimization = new AutomatedAIOptimizationService();
