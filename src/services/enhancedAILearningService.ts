import { supabase } from '@/integrations/supabase/client';

interface TemplateVariant {
  id: string;
  base_template_id: string;
  variant_name: string;
  variant_content: string;
  success_rate: number;
  usage_count: number;
}

interface LearningExperiment {
  id: string;
  experiment_name: string;
  experiment_type: string;
  control_group_config: any;
  test_group_config: any;
  status: 'active' | 'completed' | 'paused';
  control_success_rate: number;
  test_success_rate: number;
  statistical_significance: number;
}

export class EnhancedAILearningService {
  private static instance: EnhancedAILearningService;

  static getInstance(): EnhancedAILearningService {
    if (!EnhancedAILearningService.instance) {
      EnhancedAILearningService.instance = new EnhancedAILearningService();
    }
    return EnhancedAILearningService.instance;
  }

  // A/B Testing for Message Templates
  async createTemplateVariant(
    baseTemplateId: string,
    variantName: string,
    variantContent: string,
    variantType: string = 'a_b_test'
  ): Promise<string> {
    console.log('🧪 [LEARNING] Creating template variant:', variantName);

    const { data, error } = await supabase
      .from('ai_template_variants')
      .insert({
        base_template_id: baseTemplateId,
        variant_name: variantName,
        variant_content: variantContent,
        variant_type: variantType,
        is_active: true
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create template variant:', error);
      throw error;
    }

    return data.id;
  }

  async getBestPerformingVariant(baseTemplateId: string): Promise<TemplateVariant | null> {
    const { data, error } = await supabase
      .from('ai_template_variants')
      .select('*')
      .eq('base_template_id', baseTemplateId)
      .eq('is_active', true)
      .gte('usage_count', 10) // Minimum sample size
      .order('success_rate', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Failed to get best performing variant:', error);
      return null;
    }

    return data[0] || null;
  }

  // Performance-Based Template Optimization
  async optimizeTemplatePerformance(): Promise<void> {
    console.log('📈 [LEARNING] Starting template performance optimization...');

    // Get all active experiments
    const { data: experiments, error: experimentsError } = await supabase
      .from('ai_learning_experiments')
      .select('*')
      .eq('status', 'active')
      .gte('sample_size', 30); // Minimum for statistical significance

    if (experimentsError) {
      console.error('Failed to get active experiments:', experimentsError);
      return;
    }

    for (const experiment of experiments || []) {
      await this.evaluateExperiment({
        ...experiment,
        status: experiment.status as 'active' | 'completed' | 'paused',
        sample_size: experiment.sample_size || 0
      });
    }
  }

  private async evaluateExperiment(experiment: LearningExperiment): Promise<void> {
    // Calculate statistical significance
    const significance = this.calculateStatisticalSignificance(
      experiment.control_success_rate,
      experiment.test_success_rate,
      experiment.sample_size
    );

    if (significance > 0.95) { // 95% confidence
      console.log(`✅ [LEARNING] Experiment "${experiment.experiment_name}" reached significance`);
      
      // Determine winner and apply results
      const winner = experiment.test_success_rate > experiment.control_success_rate ? 'test' : 'control';
      
      await supabase
        .from('ai_learning_experiments')
        .update({
          status: 'completed',
          statistical_significance: significance,
          results: {
            winner,
            improvement: Math.abs(experiment.test_success_rate - experiment.control_success_rate),
            completed_at: new Date().toISOString()
          }
        })
        .eq('id', experiment.id);

      // Apply winning configuration
      if (winner === 'test' && experiment.experiment_type === 'template_variant') {
        await this.applyWinningTemplate(experiment.test_group_config);
      }
    }
  }

  private calculateStatisticalSignificance(
    controlRate: number,
    testRate: number,
    sampleSize: number
  ): number {
    // Simplified statistical significance calculation
    // In production, use proper statistical methods
    const pooledRate = (controlRate + testRate) / 2;
    const standardError = Math.sqrt(2 * pooledRate * (1 - pooledRate) / sampleSize);
    const zScore = Math.abs(testRate - controlRate) / standardError;
    
    // Convert z-score to confidence level (approximation)
    return Math.min(0.999, 1 - Math.exp(-0.5 * zScore * zScore));
  }

  private async applyWinningTemplate(config: any): Promise<void> {
    // Apply the winning template configuration
    console.log('🏆 [LEARNING] Applying winning template configuration');
    
    // Update the base template with winning variant
    if (config.template_id && config.winning_content) {
      await supabase
        .from('ai_template_performance')
        .update({
          template_content: config.winning_content,
          updated_at: new Date().toISOString()
        })
        .eq('id', config.template_id);
    }
  }

  // Learning from Conversation Outcomes
  async learnFromConversationOutcome(
    leadId: string,
    conversationId: string,
    outcome: 'positive_response' | 'appointment_booked' | 'no_response' | 'negative_response',
    messageCharacteristics: any
  ): Promise<void> {
    console.log('🎓 [LEARNING] Learning from conversation outcome:', outcome);

    // Store learning outcome
    await supabase
      .from('ai_learning_outcomes')
      .insert({
        lead_id: leadId,
        outcome_type: outcome,
        message_characteristics: messageCharacteristics,
        conversation_quality_score: this.calculateQualityScore(outcome),
        created_at: new Date().toISOString()
      });

    // Update related template performance
    if (messageCharacteristics.template_id) {
      await this.updateTemplatePerformance(
        messageCharacteristics.template_id,
        outcome === 'positive_response' || outcome === 'appointment_booked'
      );
    }
  }

  private calculateQualityScore(outcome: string): number {
    const scores = {
      'appointment_booked': 1.0,
      'positive_response': 0.8,
      'no_response': 0.3,
      'negative_response': 0.1
    };
    return scores[outcome as keyof typeof scores] || 0.5;
  }

  private async updateTemplatePerformance(templateId: string, wasSuccessful: boolean): Promise<void> {
    const { data: template, error: fetchError } = await supabase
      .from('ai_template_performance')
      .select('usage_count, response_count, positive_responses')
      .eq('id', templateId)
      .single();

    if (fetchError || !template) return;

    const updatedResponseCount = template.response_count + 1;
    const updatedPositiveResponses = template.positive_responses + (wasSuccessful ? 1 : 0);

    await supabase
      .from('ai_template_performance')
      .update({
        response_count: updatedResponseCount,
        positive_responses: updatedPositiveResponses,
        response_rate: updatedPositiveResponses / updatedResponseCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId);
  }

  // Automatic Template Generation and Testing
  async generateAndTestNewVariants(): Promise<void> {
    console.log('🔬 [LEARNING] Generating and testing new template variants...');

    // Get top performing templates
    const { data: topTemplates, error } = await supabase
      .from('ai_template_performance')
      .select('*')
      .gte('usage_count', 50)
      .gte('response_rate', 0.7)
      .order('response_rate', { ascending: false })
      .limit(5);

    if (error || !topTemplates) return;

    for (const template of topTemplates) {
      // Generate variants using AI (simplified for now)
      const variants = await this.generateTemplateVariants(template.template_content);
      
      for (const variant of variants) {
        await this.createTemplateVariant(
          template.id,
          `Auto-Generated ${Date.now()}`,
          variant,
          'auto_generated'
        );
      }
    }
  }

  private async generateTemplateVariants(baseContent: string): Promise<string[]> {
    // Simplified variant generation - in production, use AI to generate variants
    const variants = [
      baseContent.replace(/Hello/g, 'Hi'),
      baseContent.replace(/!/g, '.'),
      baseContent + ' Let me know if you have any questions!'
    ];

    return variants.filter(v => v !== baseContent);
  }

  // Get Learning Insights
  async getLearningInsights(): Promise<any> {
    const { data: insights, error } = await supabase
      .from('ai_learning_insights')
      .select('*')
      .eq('implemented', false)
      .eq('actionable', true)
      .order('confidence_score', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Failed to get learning insights:', error);
      return [];
    }

    return insights || [];
  }

  // Mark insights as implemented
  async implementInsight(insightId: string): Promise<void> {
    await supabase
      .from('ai_learning_insights')
      .update({ 
        implemented: true,
        last_validated_at: new Date().toISOString()
      })
      .eq('id', insightId);
  }
}

export const enhancedAILearningService = EnhancedAILearningService.getInstance();