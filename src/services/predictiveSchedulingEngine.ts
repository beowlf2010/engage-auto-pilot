import { supabase } from '@/integrations/supabase/client';
import { predictivePerformanceEngine } from './predictivePerformanceEngine';

interface OptimalSendTime {
  leadId: string;
  optimalDateTime: Date;
  confidence: number;
  reasoning: string[];
  fallbackTimes: Date[];
}

interface ScheduleOptimization {
  leadId: string;
  currentSchedule?: Date;
  optimizedSchedule: Date;
  improvementFactor: number;
  expectedResponseIncrease: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface LeadEngagementWindow {
  leadId: string;
  preferredHours: number[];
  preferredDays: number[];
  timezone: string;
  responsePatterns: {
    hour: number;
    dayOfWeek: number;
    responseRate: number;
    avgResponseTime: number;
  }[];
}

export class PredictiveSchedulingEngine {
  private static instance: PredictiveSchedulingEngine;
  private engagementWindows = new Map<string, LeadEngagementWindow>();
  private lastOptimization = 0;
  private optimizationInterval = 60 * 60 * 1000; // 1 hour

  static getInstance(): PredictiveSchedulingEngine {
    if (!PredictiveSchedulingEngine.instance) {
      PredictiveSchedulingEngine.instance = new PredictiveSchedulingEngine();
    }
    return PredictiveSchedulingEngine.instance;
  }

  async calculateOptimalSendTime(
    leadId: string,
    messageContent?: string,
    urgencyLevel: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<OptimalSendTime> {
    console.log('📅 [SCHEDULING ENGINE] Calculating optimal send time for:', leadId);

    try {
      // Get lead engagement patterns
      const engagementWindow = await this.getLeadEngagementWindow(leadId);
      
      // Get predictive performance data
      let performancePrediction = null;
      if (messageContent) {
        performancePrediction = await predictivePerformanceEngine.predictMessagePerformance(
          messageContent,
          leadId,
          urgencyLevel
        );
      }

      // Calculate optimal time based on multiple factors
      const optimalDateTime = this.computeOptimalDateTime(
        engagementWindow,
        urgencyLevel,
        performancePrediction
      );

      // Generate fallback times
      const fallbackTimes = this.generateFallbackTimes(engagementWindow, optimalDateTime);

      // Calculate confidence based on data quality
      const confidence = this.calculateTimeConfidence(engagementWindow, performancePrediction);

      // Generate reasoning
      const reasoning = this.generateTimeReasoning(
        engagementWindow,
        urgencyLevel,
        performancePrediction,
        optimalDateTime
      );

      const result: OptimalSendTime = {
        leadId,
        optimalDateTime,
        confidence,
        reasoning,
        fallbackTimes
      };

      console.log('✅ [SCHEDULING ENGINE] Optimal time calculated:', {
        optimalTime: optimalDateTime.toISOString(),
        confidence,
        hoursFromNow: (optimalDateTime.getTime() - Date.now()) / (1000 * 60 * 60)
      });

      return result;

    } catch (error) {
      console.error('❌ [SCHEDULING ENGINE] Error calculating optimal time:', error);
      return this.getFallbackSchedule(leadId, urgencyLevel);
    }
  }

  async optimizeExistingSchedules(): Promise<ScheduleOptimization[]> {
    console.log('🔧 [SCHEDULING ENGINE] Optimizing existing schedules...');

    try {
      // Get all pending scheduled messages
      const { data: pendingMessages } = await supabase
        .from('ai_trigger_messages')
        .select(`
          id,
          lead_id,
          message_content,
          urgency_level,
          generated_at,
          leads!inner(first_name, last_name)
        `)
        .eq('approved', false)
        .is('sent_at', null)
        .gte('generated_at', new Date().toISOString())
        .limit(50);

      if (!pendingMessages || pendingMessages.length === 0) {
        return [];
      }

      const optimizations: ScheduleOptimization[] = [];

      // Process each message for schedule optimization
      for (const message of pendingMessages) {
        try {
          const currentSchedule = new Date(message.generated_at);
          
          // Calculate new optimal time
          const optimalTime = await this.calculateOptimalSendTime(
            message.lead_id,
            message.message_content,
            message.urgency_level as 'low' | 'medium' | 'high'
          );

          // Calculate improvement factor
          const timeDifference = Math.abs(
            optimalTime.optimalDateTime.getTime() - currentSchedule.getTime()
          ) / (1000 * 60 * 60); // hours

          if (timeDifference > 1 && optimalTime.confidence > 70) {
            // Get expected improvement
            const expectedIncrease = await this.calculateExpectedImprovement(
              message.lead_id,
              currentSchedule,
              optimalTime.optimalDateTime
            );

            if (expectedIncrease > 5) { // Only if significant improvement expected
              const optimization: ScheduleOptimization = {
                leadId: message.lead_id,
                currentSchedule,
                optimizedSchedule: optimalTime.optimalDateTime,
                improvementFactor: expectedIncrease,
                expectedResponseIncrease: expectedIncrease,
                riskLevel: this.assessOptimizationRisk(currentSchedule, optimalTime.optimalDateTime)
              };

              optimizations.push(optimization);

              // Apply optimization if risk is low
              if (optimization.riskLevel === 'low') {
                await this.applyScheduleOptimization(message.id, optimalTime.optimalDateTime);
              }
            }
          }

        } catch (error) {
          console.error(`Error optimizing schedule for message ${message.id}:`, error);
        }
      }

      console.log(`✅ [SCHEDULING ENGINE] Generated ${optimizations.length} schedule optimizations`);
      
      // Store optimization metrics
      await this.storeOptimizationMetrics(optimizations);

      return optimizations;

    } catch (error) {
      console.error('❌ [SCHEDULING ENGINE] Error optimizing schedules:', error);
      return [];
    }
  }

  private async getLeadEngagementWindow(leadId: string): Promise<LeadEngagementWindow> {
    // Check cache first
    if (this.engagementWindows.has(leadId)) {
      return this.engagementWindows.get(leadId)!;
    }

    // Build engagement window from conversation history
    const window = await this.buildEngagementWindow(leadId);
    this.engagementWindows.set(leadId, window);
    return window;
  }

  private async buildEngagementWindow(leadId: string): Promise<LeadEngagementWindow> {
    // Get lead's conversation history with timestamps
    const { data: conversations } = await supabase
      .from('conversations')
      .select('direction, sent_at, body')
      .eq('lead_id', leadId)
      .eq('direction', 'in') // Customer responses only
      .order('sent_at', { ascending: true })
      .limit(100);

    if (!conversations || conversations.length === 0) {
      return this.getDefaultEngagementWindow(leadId);
    }

    // Analyze response patterns
    const responsePatterns: { hour: number; dayOfWeek: number; responseRate: number; avgResponseTime: number; }[] = [];
    const hourCounts: Record<number, number> = {};
    const dayCounts: Record<number, number> = {};

    conversations.forEach(conv => {
      const date = new Date(conv.sent_at);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();

      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      dayCounts[dayOfWeek] = (dayCounts[dayOfWeek] || 0) + 1;

      responsePatterns.push({
        hour,
        dayOfWeek,
        responseRate: 100, // Assuming response since these are incoming messages
        avgResponseTime: 0 // Would calculate from outbound->inbound pairs
      });
    });

    // Extract preferred hours (top 3)
    const preferredHours = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    // Extract preferred days (top 3)
    const preferredDays = Object.entries(dayCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([day]) => parseInt(day));

    return {
      leadId,
      preferredHours: preferredHours.length > 0 ? preferredHours : [9, 14, 18],
      preferredDays: preferredDays.length > 0 ? preferredDays : [1, 2, 3, 4, 5], // Weekdays
      timezone: 'America/New_York', // Default, could be enhanced with geo data
      responsePatterns
    };
  }

  private computeOptimalDateTime(
    engagementWindow: LeadEngagementWindow,
    urgencyLevel: string,
    performancePrediction?: any
  ): Date {
    const now = new Date();
    let targetDate = new Date(now);

    // Base delay based on urgency
    const urgencyDelays = {
      high: 0.5,     // 30 minutes
      medium: 2,     // 2 hours  
      low: 4         // 4 hours
    };

    const baseDelayHours = urgencyDelays[urgencyLevel as keyof typeof urgencyDelays] || 2;
    targetDate.setTime(targetDate.getTime() + baseDelayHours * 60 * 60 * 1000);

    // Find next preferred hour
    const currentHour = targetDate.getHours();
    const nextPreferredHour = engagementWindow.preferredHours.find(hour => hour > currentHour) ||
                             engagementWindow.preferredHours[0];

    // Adjust to preferred hour
    if (nextPreferredHour <= currentHour) {
      targetDate.setDate(targetDate.getDate() + 1); // Next day
    }
    targetDate.setHours(nextPreferredHour, 0, 0, 0);

    // Ensure it's on a preferred day
    while (!engagementWindow.preferredDays.includes(targetDate.getDay())) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    // Use performance prediction if available
    if (performancePrediction?.optimalSendTime) {
      const predictedTime = new Date(performancePrediction.optimalSendTime);
      
      // Blend our calculation with prediction (weighted average)
      const blendedTime = new Date(
        (targetDate.getTime() * 0.6) + (predictedTime.getTime() * 0.4)
      );
      
      return blendedTime;
    }

    return targetDate;
  }

  private generateFallbackTimes(window: LeadEngagementWindow, optimalTime: Date): Date[] {
    const fallbacks: Date[] = [];
    
    // Generate 3 fallback times within preferred hours
    window.preferredHours.forEach(hour => {
      const fallback = new Date(optimalTime);
      fallback.setHours(hour, 0, 0, 0);
      
      // Ensure it's different from optimal time and in the future
      if (fallback.getTime() !== optimalTime.getTime() && fallback.getTime() > Date.now()) {
        fallbacks.push(fallback);
      }
    });

    return fallbacks.slice(0, 3).sort((a, b) => a.getTime() - b.getTime());
  }

  private calculateTimeConfidence(
    window: LeadEngagementWindow,
    performancePrediction?: any
  ): number {
    let confidence = 50;

    // Data quality factors
    if (window.responsePatterns.length > 10) {
      confidence += 20;
    } else if (window.responsePatterns.length > 5) {
      confidence += 10;
    }

    // Preference clarity
    if (window.preferredHours.length >= 2) {
      confidence += 15;
    }

    // Performance prediction availability
    if (performancePrediction?.confidenceScore) {
      confidence += performancePrediction.confidenceScore * 0.15;
    }

    return Math.max(0, Math.min(100, confidence));
  }

  private generateTimeReasoning(
    window: LeadEngagementWindow,
    urgencyLevel: string,
    performancePrediction: any,
    optimalTime: Date
  ): string[] {
    const reasoning: string[] = [];

    if (window.preferredHours.length > 0) {
      reasoning.push(`Lead typically responds during hours: ${window.preferredHours.join(', ')}`);
    }

    if (urgencyLevel === 'high') {
      reasoning.push('High urgency - minimized delay');
    } else if (urgencyLevel === 'low') {
      reasoning.push('Low urgency - optimized for engagement timing');
    }

    if (performancePrediction?.confidenceScore > 70) {
      reasoning.push(`Performance prediction confidence: ${performancePrediction.confidenceScore}%`);
    }

    const hoursFromNow = (optimalTime.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursFromNow > 24) {
      reasoning.push('Scheduled for optimal day of week');
    }

    return reasoning;
  }

  private async calculateExpectedImprovement(
    leadId: string,
    currentTime: Date,
    optimizedTime: Date
  ): Promise<number> {
    // Simplified improvement calculation
    // In practice, this would use ML models trained on historical data
    
    const window = await this.getLeadEngagementWindow(leadId);
    const currentHour = currentTime.getHours();
    const optimizedHour = optimizedTime.getHours();

    let improvement = 0;

    // Hour preference factor
    if (window.preferredHours.includes(optimizedHour) && !window.preferredHours.includes(currentHour)) {
      improvement += 15;
    }

    // Day preference factor
    const currentDay = currentTime.getDay();
    const optimizedDay = optimizedTime.getDay();
    
    if (window.preferredDays.includes(optimizedDay) && !window.preferredDays.includes(currentDay)) {
      improvement += 10;
    }

    return improvement;
  }

  private assessOptimizationRisk(currentTime: Date, optimizedTime: Date): 'low' | 'medium' | 'high' {
    const timeDifference = Math.abs(optimizedTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
    
    if (timeDifference > 48) return 'high';      // More than 2 days
    if (timeDifference > 24) return 'medium';    // More than 1 day
    return 'low';                                // Less than 1 day
  }

  private async applyScheduleOptimization(messageId: string, newScheduleTime: Date): Promise<void> {
    try {
      await supabase
        .from('ai_trigger_messages')
        .update({
          generated_at: newScheduleTime.toISOString()
        })
        .eq('id', messageId);

      console.log(`📅 [SCHEDULING ENGINE] Applied optimization to message ${messageId}`);
    } catch (error) {
      console.error(`Failed to apply schedule optimization for ${messageId}:`, error);
    }
  }

  private async storeOptimizationMetrics(optimizations: ScheduleOptimization[]): Promise<void> {
    try {
      const totalOptimizations = optimizations.length;
      const avgImprovement = optimizations.length > 0 
        ? optimizations.reduce((sum, opt) => sum + opt.improvementFactor, 0) / optimizations.length
        : 0;

      await supabase
        .from('ai_learning_metrics')
        .insert({
          optimization_triggers: totalOptimizations,
          response_rate_improvement: avgImprovement
        });
    } catch (error) {
      console.error('Failed to store optimization metrics:', error);
    }
  }

  private getDefaultEngagementWindow(leadId: string): LeadEngagementWindow {
    return {
      leadId,
      preferredHours: [9, 14, 18], // 9 AM, 2 PM, 6 PM
      preferredDays: [1, 2, 3, 4, 5], // Monday to Friday
      timezone: 'America/New_York',
      responsePatterns: []
    };
  }

  private getFallbackSchedule(leadId: string, urgencyLevel: string): OptimalSendTime {
    const now = new Date();
    const fallbackTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now

    return {
      leadId,
      optimalDateTime: fallbackTime,
      confidence: 30,
      reasoning: ['Using fallback schedule due to insufficient data'],
      fallbackTimes: []
    };
  }

  // Public methods for external access
  async runScheduleOptimization(): Promise<void> {
    const now = Date.now();
    if (now - this.lastOptimization < this.optimizationInterval) {
      return; // Don't optimize too frequently
    }

    console.log('🔄 [SCHEDULING ENGINE] Running periodic schedule optimization...');
    
    const optimizations = await this.optimizeExistingSchedules();
    
    console.log(`✅ [SCHEDULING ENGINE] Optimization complete: ${optimizations.length} schedules optimized`);
    
    this.lastOptimization = now;
  }

  clearCache(): void {
    this.engagementWindows.clear();
    this.lastOptimization = 0;
  }

  getCacheStats(): { engagementWindows: number; lastOptimization: Date } {
    return {
      engagementWindows: this.engagementWindows.size,
      lastOptimization: new Date(this.lastOptimization)
    };
  }
}

export const predictiveSchedulingEngine = PredictiveSchedulingEngine.getInstance();