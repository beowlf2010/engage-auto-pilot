import { supabase } from '@/integrations/supabase/client';

export interface MessagePerformanceData {
  leadId: string;
  messageId: string | null;
  templateStage: string;
  templateContent: string;
  sentAt: Date;
  responseReceived?: boolean;
  responseTimeHours?: number;
  respondedAt?: Date;
}

export interface TimingInsight {
  stage: string;
  optimalHour: number;
  optimalDayOffset: number;
  responseRate: number;
  avgResponseTime: number;
  confidence: number;
  sampleSize: number;
}

class AggressiveCadenceLearningService {
  // Update timing analytics when a message is sent
  async trackMessageSent(data: MessagePerformanceData): Promise<void> {
    try {
      const { leadId, templateStage, sentAt } = data;
      const hour = sentAt.getHours();
      const dayOfWeek = sentAt.getDay();

      // Update timing analytics
      const { data: existing } = await (supabase
        .from('ai_timing_analytics') as any)
        .select('*')
        .eq('template_stage', templateStage)
        .eq('hour_of_day', hour)
        .eq('day_of_week', dayOfWeek)
        .single();

      if (existing) {
        await (supabase.from('ai_timing_analytics') as any)
          .update({
            total_sent: existing.total_sent + 1,
            last_updated: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        await (supabase.from('ai_timing_analytics') as any)
          .insert({
            template_stage: templateStage,
            hour_of_day: hour,
            day_of_week: dayOfWeek,
            total_sent: 1,
            total_responses: 0,
            response_rate: 0,
            avg_response_time_hours: 0
          });
      }

      console.log(`📈 [CADENCE LEARNING] Tracked message sent: ${templateStage} at ${hour}:00 on day ${dayOfWeek}`);
    } catch (error) {
      console.error('❌ [CADENCE LEARNING] Error tracking message sent:', error);
    }
  }

  // Update analytics when a response is received
  async trackResponse(leadId: string, messageStage: string, responseTimeHours: number): Promise<void> {
    try {
      // Get the original message performance record
      const { data: messagePerf } = await (supabase
        .from('ai_message_performance') as any)
        .select('*')
        .eq('lead_id', leadId)
        .eq('template_stage', messageStage)
        .order('sent_at', { ascending: false })
        .limit(1)
        .single();

      if (messagePerf) {
        // Update message performance record
        await (supabase.from('ai_message_performance') as any)
          .update({
            response_received: true,
            response_time_hours: responseTimeHours,
            responded_at: new Date().toISOString(),
            message_effectiveness_score: this.calculateEffectivenessScore(responseTimeHours)
          })
          .eq('id', messagePerf.id);

        // Update timing analytics
        const { data: timingAnalytics } = await (supabase
          .from('ai_timing_analytics') as any)
          .select('*')
          .eq('template_stage', messageStage)
          .eq('hour_of_day', messagePerf.sent_hour)
          .eq('day_of_week', messagePerf.sent_day_of_week)
          .single();

        if (timingAnalytics) {
          const newTotalResponses = timingAnalytics.total_responses + 1;
          const newResponseRate = newTotalResponses / timingAnalytics.total_sent;
          const newAvgResponseTime = ((timingAnalytics.avg_response_time_hours * timingAnalytics.total_responses) + responseTimeHours) / newTotalResponses;

          await (supabase.from('ai_timing_analytics') as any)
            .update({
              total_responses: newTotalResponses,
              response_rate: newResponseRate,
              avg_response_time_hours: newAvgResponseTime,
              last_updated: new Date().toISOString()
            })
            .eq('id', timingAnalytics.id);
        }
      }

      console.log(`🎯 [CADENCE LEARNING] Response tracked for ${messageStage}: ${responseTimeHours.toFixed(1)}h response time`);
    } catch (error) {
      console.error('❌ [CADENCE LEARNING] Error tracking response:', error);
    }
  }

  // Calculate effectiveness score based on response time (faster = better)
  private calculateEffectivenessScore(responseTimeHours: number): number {
    // Score from 0.0 to 1.0, with faster responses scoring higher
    if (responseTimeHours <= 1) return 1.0;      // Excellent: 1h or less
    if (responseTimeHours <= 4) return 0.9;      // Great: 1-4h
    if (responseTimeHours <= 12) return 0.7;     // Good: 4-12h
    if (responseTimeHours <= 24) return 0.5;     // Fair: 12-24h
    if (responseTimeHours <= 48) return 0.3;     // Poor: 24-48h
    return 0.1;                                  // Very poor: 48h+
  }

  // Analyze and update optimal timing recommendations
  async analyzeOptimalTiming(): Promise<TimingInsight[]> {
    try {
      console.log('🔍 [CADENCE LEARNING] Analyzing optimal timing patterns...');

      const insights: TimingInsight[] = [];

      // Get all timing analytics with sufficient data
      const { data: timingData } = await (supabase
        .from('ai_timing_analytics') as any)
        .select('*')
        .gte('total_sent', 5) // At least 5 sends for statistical relevance
        .order('response_rate', { ascending: false });

      if (!timingData || timingData.length === 0) {
        console.log('📊 [CADENCE LEARNING] Insufficient data for analysis');
        return insights;
      }

      // Group by template stage and find optimal times
      const stageGroups = timingData.reduce((acc: any, row: any) => {
        if (!acc[row.template_stage]) {
          acc[row.template_stage] = [];
        }
        acc[row.template_stage].push(row);
        return acc;
      }, {});

      for (const [stage, stageData] of Object.entries(stageGroups)) {
        const data = stageData as any[];
        
        // Find the hour/day combination with highest response rate
        const bestTiming = data.reduce((best, current) => {
          return current.response_rate > best.response_rate ? current : best;
        });

        const totalSent = data.reduce((sum, row) => sum + row.total_sent, 0);
        const totalResponses = data.reduce((sum, row) => sum + row.total_responses, 0);
        const avgResponseRate = totalSent > 0 ? totalResponses / totalSent : 0;

        insights.push({
          stage,
          optimalHour: bestTiming.hour_of_day,
          optimalDayOffset: this.calculateDayOffset(stage),
          responseRate: bestTiming.response_rate,
          avgResponseTime: bestTiming.avg_response_time_hours || 0,
          confidence: Math.min(totalSent / 50, 1.0), // Confidence increases with sample size
          sampleSize: totalSent
        });

        // Update optimal timing recommendations if confidence is high enough
        if (totalSent >= 20) {
          await (supabase.from('ai_optimal_timing') as any)
            .upsert({
              template_stage: stage,
              recommended_hour: bestTiming.hour_of_day,
              recommended_day_offset_hours: this.calculateDayOffset(stage),
              confidence_score: Math.min(totalSent / 50, 1.0),
              sample_size: totalSent,
              last_analysis: new Date().toISOString()
            });
        }
      }

      console.log(`✨ [CADENCE LEARNING] Analysis complete: ${insights.length} stages analyzed`);
      return insights;
    } catch (error) {
      console.error('❌ [CADENCE LEARNING] Error analyzing optimal timing:', error);
      return [];
    }
  }

  // Convert stage to expected day offset for aggressive cadence
  private calculateDayOffset(stage: string): number {
    const stageMap: { [key: string]: number } = {
      'initial': 0,
      'follow_up_1': 7,
      'follow_up_2': 18,
      'follow_up_3': 34,
      'follow_up_4': 46,
      'follow_up_5': 72,
      'follow_up_6': 96,
      'follow_up_7': 120,
      'follow_up_8': 168,
      'follow_up_9': 240
    };
    return stageMap[stage] || 24;
  }

  // Get performance summary for dashboard
  async getPerformanceSummary(): Promise<any> {
    try {
      const { data: recentPerformance } = await (supabase
        .from('ai_message_performance') as any)
        .select('*')
        .gte('sent_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('sent_at', { ascending: false });

      const { data: topTimings } = await (supabase
        .from('ai_timing_analytics') as any)
        .select('*')
        .order('response_rate', { ascending: false })
        .limit(10);

      const totalSent = recentPerformance?.length || 0;
      const totalResponses = recentPerformance?.filter((r: any) => r.response_received).length || 0;
      const avgResponseTime = recentPerformance?.reduce((sum: number, r: any) => 
        sum + (r.response_time_hours || 0), 0) / Math.max(totalResponses, 1);

      return {
        weekly: {
          totalSent,
          totalResponses,
          responseRate: totalSent > 0 ? totalResponses / totalSent : 0,
          avgResponseTime: avgResponseTime || 0
        },
        topPerformingTimes: topTimings || [],
        lastAnalysis: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ [CADENCE LEARNING] Error getting performance summary:', error);
      return {
        weekly: { totalSent: 0, totalResponses: 0, responseRate: 0, avgResponseTime: 0 },
        topPerformingTimes: [],
        lastAnalysis: new Date().toISOString()
      };
    }
  }

  // Initialize learning system (run once)
  async initialize(): Promise<void> {
    try {
      console.log('🚀 [CADENCE LEARNING] Initializing aggressive cadence learning system...');
      
      // Schedule periodic analysis (would be done via cron in production)
      console.log('✅ [CADENCE LEARNING] Learning system initialized');
    } catch (error) {
      console.error('❌ [CADENCE LEARNING] Error initializing learning system:', error);
    }
  }
}

export const aggressiveCadenceLearningService = new AggressiveCadenceLearningService();