
import { supabase } from '@/integrations/supabase/client';
import { messageQualityService } from './messageQualityService';

export interface LearningEvent {
  type: 'message_sent' | 'response_received' | 'conversion' | 'appointment_booked';
  leadId: string;
  data: any;
  timestamp: Date;
  context?: any;
}

export interface OptimizationInsight {
  id: string;
  type: 'timing' | 'content' | 'frequency' | 'targeting';
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  recommendation: string;
  expectedImprovement: number;
  implementedAt?: Date;
}

class RealtimeLearningEngine {
  private eventQueue: LearningEvent[] = [];
  private processingActive = false;

  // Process learning events in real-time
  async processLearningEvent(event: LearningEvent): Promise<void> {
    console.log('🧠 [LEARNING] Processing event:', event.type, 'for lead', event.leadId);
    
    this.eventQueue.push(event);
    
    // Process events in batches for efficiency
    if (!this.processingActive && this.eventQueue.length >= 3) {
      await this.processBatch();
    }
  }

  // Process batch of learning events
  private async processBatch(): Promise<void> {
    if (this.processingActive || this.eventQueue.length === 0) return;
    
    this.processingActive = true;
    
    try {
      const events = [...this.eventQueue];
      this.eventQueue = [];
      
      for (const event of events) {
        await this.analyzeEvent(event);
      }
      
      // Generate optimization insights
      const insights = await this.generateOptimizationInsights();
      await this.storeInsights(insights);
      
    } catch (error) {
      console.error('❌ [LEARNING] Error processing batch:', error);
    } finally {
      this.processingActive = false;
    }
  }

  // Analyze individual learning event
  private async analyzeEvent(event: LearningEvent): Promise<void> {
    switch (event.type) {
      case 'message_sent':
        await this.analyzeMessageSent(event);
        break;
      case 'response_received':
        await this.analyzeResponseReceived(event);
        break;
      case 'conversion':
        await this.analyzeConversion(event);
        break;
      case 'appointment_booked':
        await this.analyzeAppointmentBooked(event);
        break;
    }
  }

  // Analyze message sending patterns
  private async analyzeMessageSent(event: LearningEvent): Promise<void> {
    const { leadId, data, timestamp } = event;
    
    // Store message analytics
    await supabase.from('ai_message_analytics').insert({
      lead_id: leadId,
      message_content: data.content,
      message_stage: data.stage || 'follow_up',
      sent_at: timestamp.toISOString(),
      hour_of_day: timestamp.getHours(),
      day_of_week: timestamp.getDay(),
      inventory_mentioned: data.inventoryMentioned || null
    });
  }

  // Analyze customer response patterns
  private async analyzeResponseReceived(event: LearningEvent): Promise<void> {
    const { leadId, data, timestamp } = event;
    
    // Update response patterns
    await supabase.from('lead_communication_patterns').upsert({
      lead_id: leadId,
      response_patterns: {
        lastResponseTime: timestamp.toISOString(),
        responseSpeed: data.responseTimeHours || 24,
        sentiment: data.sentiment || 'neutral'
      },
      learning_confidence: Math.min(1.0, (data.currentConfidence || 0) + 0.1),
      updated_at: new Date().toISOString()
    });
  }

  // Analyze successful conversions
  private async analyzeConversion(event: LearningEvent): Promise<void> {
    const { leadId, data } = event;
    
    // Store learning outcome
    await supabase.from('ai_learning_outcomes').insert({
      lead_id: leadId,
      outcome_type: data.conversionType || 'sale',
      outcome_value: data.value || 0,
      days_to_outcome: data.daysToConversion || 0,
      message_characteristics: data.messageCharacteristics || {},
      lead_characteristics: data.leadCharacteristics || {},
      success_factors: data.successFactors || {}
    });
  }

  // Analyze appointment booking patterns
  private async analyzeAppointmentBooked(event: LearningEvent): Promise<void> {
    const { leadId, data } = event;
    
    // Track appointment booking as positive outcome
    await supabase.from('ai_learning_outcomes').insert({
      lead_id: leadId,
      outcome_type: 'appointment_booked',
      days_to_outcome: data.daysToBooking || 0,
      message_characteristics: {
        messageType: data.messageType,
        timeOfDay: data.timeOfDay,
        dayOfWeek: data.dayOfWeek
      },
      success_factors: {
        urgencyLevel: data.urgencyLevel,
        inventoryMentioned: data.inventoryMentioned
      }
    });
  }

  // Generate optimization insights from learning data
  private async generateOptimizationInsights(): Promise<OptimizationInsight[]> {
    const insights: OptimizationInsight[] = [];
    
    // Analyze timing patterns
    const timingInsight = await this.analyzeOptimalTiming();
    if (timingInsight) insights.push(timingInsight);
    
    // Analyze content performance
    const contentInsight = await this.analyzeContentPerformance();
    if (contentInsight) insights.push(contentInsight);
    
    // Analyze frequency patterns
    const frequencyInsight = await this.analyzeMessageFrequency();
    if (frequencyInsight) insights.push(frequencyInsight);
    
    return insights;
  }

  // Analyze optimal timing patterns
  private async analyzeOptimalTiming(): Promise<OptimizationInsight | null> {
    const { data: analytics } = await supabase
      .from('ai_message_analytics')
      .select('hour_of_day, response_time_hours')
      .not('response_time_hours', 'is', null)
      .gte('sent_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    
    if (!analytics || analytics.length < 10) return null;
    
    // Find optimal hours (fastest response times)
    const hourlyStats = new Map();
    analytics.forEach(record => {
      const hour = record.hour_of_day;
      if (!hourlyStats.has(hour)) {
        hourlyStats.set(hour, { total: 0, responses: 0, avgResponseTime: 0 });
      }
      const stats = hourlyStats.get(hour);
      stats.total++;
      stats.responses++;
      stats.avgResponseTime = (stats.avgResponseTime * (stats.responses - 1) + record.response_time_hours) / stats.responses;
    });
    
    const bestHours = Array.from(hourlyStats.entries())
      .filter(([hour, stats]) => stats.responses >= 3)
      .sort((a, b) => a[1].avgResponseTime - b[1].avgResponseTime)
      .slice(0, 3)
      .map(([hour]) => hour);
    
    if (bestHours.length > 0) {
      return {
        id: `timing_${Date.now()}`,
        type: 'timing',
        confidence: 0.8,
        impact: 'medium',
        recommendation: `Send messages at ${bestHours.join(', ')}:00 for faster responses`,
        expectedImprovement: 15
      };
    }
    
    return null;
  }

  // Analyze content performance
  private async analyzeContentPerformance(): Promise<OptimizationInsight | null> {
    const { data: templates } = await supabase
      .from('ai_template_performance')
      .select('*')
      .gte('last_used_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
      .order('performance_score', { ascending: false })
      .limit(5);
    
    if (!templates || templates.length < 3) return null;
    
    const topTemplate = templates[0];
    const avgPerformance = templates.reduce((sum, t) => sum + t.performance_score, 0) / templates.length;
    
    if (topTemplate.performance_score > avgPerformance * 1.2) {
      return {
        id: `content_${Date.now()}`,
        type: 'content',
        confidence: 0.9,
        impact: 'high',
        recommendation: `Use high-performing template patterns: "${topTemplate.template_content.substring(0, 50)}..."`,
        expectedImprovement: 25
      };
    }
    
    return null;
  }

  // Analyze message frequency patterns
  private async analyzeMessageFrequency(): Promise<OptimizationInsight | null> {
    const { data: patterns } = await supabase
      .from('lead_communication_patterns')
      .select('*')
      .not('response_patterns', 'is', null)
      .limit(100);
    
    if (!patterns || patterns.length < 20) return null;
    
    // Analyze response rates by frequency
    let highFreqResponses = 0, lowFreqResponses = 0;
    let highFreqTotal = 0, lowFreqTotal = 0;
    
    patterns.forEach(pattern => {
      const responseData = pattern.response_patterns as any;
      const frequency = responseData?.messageFrequency || 'medium';
      const hasResponse = responseData?.lastResponseTime ? 1 : 0;
      
      if (frequency === 'high') {
        highFreqTotal++;
        highFreqResponses += hasResponse;
      } else if (frequency === 'low') {
        lowFreqTotal++;
        lowFreqResponses += hasResponse;
      }
    });
    
    const highFreqRate = highFreqTotal > 0 ? highFreqResponses / highFreqTotal : 0;
    const lowFreqRate = lowFreqTotal > 0 ? lowFreqResponses / lowFreqTotal : 0;
    
    if (Math.abs(highFreqRate - lowFreqRate) > 0.15) {
      const betterFreq = highFreqRate > lowFreqRate ? 'higher' : 'lower';
      return {
        id: `frequency_${Date.now()}`,
        type: 'frequency',
        confidence: 0.7,
        impact: 'medium',
        recommendation: `Consider ${betterFreq} message frequency for better response rates`,
        expectedImprovement: Math.abs(highFreqRate - lowFreqRate) * 100
      };
    }
    
    return null;
  }

  // Store optimization insights
  private async storeInsights(insights: OptimizationInsight[]): Promise<void> {
    for (const insight of insights) {
      console.log('💡 [LEARNING] Generated insight:', insight.recommendation);
      
      // Store in analytics for dashboard display
      await supabase.from('ai_optimization_insights').insert({
        insight_type: insight.type,
        confidence: insight.confidence,
        impact: insight.impact,
        recommendation: insight.recommendation,
        expected_improvement: insight.expectedImprovement,
        created_at: new Date().toISOString()
      });
    }
  }

  // Get recent optimization insights
  async getOptimizationInsights(limit = 10): Promise<OptimizationInsight[]> {
    const { data } = await supabase
      .from('ai_optimization_insights')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    return data || [];
  }
}

export const realtimeLearningEngine = new RealtimeLearningEngine();
