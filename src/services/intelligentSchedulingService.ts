import { supabase } from '@/integrations/supabase/client';

export interface SchedulingContext {
  leadId: string;
  messageType: 'initial' | 'follow_up' | 'nurture' | 'closing';
  urgencyLevel: 'low' | 'normal' | 'high';
  leadBehavior?: {
    responsePattern: string;
    preferredTimes: number[];
    averageResponseTime: number;
  };
}

export interface OptimalSendTime {
  scheduledFor: Date;
  confidence: number;
  reasoning: string;
  adjustedForBusinessHours: boolean;
}

class IntelligentSchedulingService {
  // Calculate optimal send time for a message
  async calculateOptimalSendTime(context: SchedulingContext): Promise<OptimalSendTime> {
    try {
      console.log(`📅 [SCHEDULING] Calculating optimal time for lead ${context.leadId}`);

      // Get lead's historical response patterns
      const responsePatterns = await this.getLeadResponsePatterns(context.leadId);
      
      // Get current message frequency to avoid over-messaging
      const messageFrequency = await this.getCurrentMessageFrequency(context.leadId);
      
      // Calculate base timing based on message type and urgency
      let baseHours = this.getBaseTimingHours(context.messageType, context.urgencyLevel);
      
      // Adjust based on lead behavior
      if (responsePatterns.preferredHours.length > 0) {
        baseHours = this.adjustForPreferredTimes(baseHours, responsePatterns.preferredHours);
      }
      
      // Adjust for message frequency (prevent over-messaging)
      if (messageFrequency.todayCount >= 2) {
        baseHours = Math.max(baseHours, 24); // Wait at least 24 hours if already sent 2+ today
      }
      
      // Calculate scheduled time
      const now = new Date();
      const scheduledFor = new Date(now.getTime() + (baseHours * 60 * 60 * 1000));
      
      // Adjust for business hours
      const adjustedTime = this.adjustForBusinessHours(scheduledFor);
      const adjustedForBusinessHours = adjustedTime.getTime() !== scheduledFor.getTime();
      
      // Calculate confidence based on data quality
      const confidence = this.calculateConfidence(responsePatterns, messageFrequency);
      
      // Generate reasoning
      const reasoning = this.generateSchedulingReasoning(
        context, 
        baseHours, 
        responsePatterns, 
        messageFrequency,
        adjustedForBusinessHours
      );

      return {
        scheduledFor: adjustedTime,
        confidence,
        reasoning,
        adjustedForBusinessHours
      };

    } catch (error) {
      console.error('❌ [SCHEDULING] Error calculating optimal send time:', error);
      
      // Fallback to simple scheduling
      const fallbackTime = new Date();
      fallbackTime.setHours(fallbackTime.getHours() + 2);
      
      return {
        scheduledFor: this.adjustForBusinessHours(fallbackTime),
        confidence: 0.5,
        reasoning: 'Fallback timing due to calculation error',
        adjustedForBusinessHours: true
      };
    }
  }

  // Get lead's historical response patterns
  private async getLeadResponsePatterns(leadId: string) {
    try {
      // Get conversation history with timestamps
      const { data: conversations } = await supabase
        .from('conversations')
        .select('direction, sent_at, created_at')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: false })
        .limit(50);

      const patterns = {
        preferredHours: [] as number[],
        averageResponseTime: 24, // Default 24 hours
        responseRate: 0,
        totalConversations: conversations?.length || 0
      };

      if (!conversations || conversations.length === 0) {
        return patterns;
      }

      // Analyze response times
      const responseTimes: number[] = [];
      const preferredHours: number[] = [];
      let customerMessages = 0;

      for (let i = 0; i < conversations.length - 1; i++) {
        const current = conversations[i];
        const previous = conversations[i + 1];

        if (current.direction === 'in' && previous.direction === 'out') {
          // Customer responded to our message
          const responseTime = new Date(current.sent_at).getTime() - new Date(previous.sent_at).getTime();
          const hours = responseTime / (1000 * 60 * 60);
          responseTimes.push(hours);

          // Track preferred hours
          const hour = new Date(current.sent_at).getHours();
          preferredHours.push(hour);
          customerMessages++;
        }
      }

      // Calculate average response time
      if (responseTimes.length > 0) {
        patterns.averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      }

      // Calculate response rate
      const outboundMessages = conversations.filter(c => c.direction === 'out').length;
      patterns.responseRate = outboundMessages > 0 ? customerMessages / outboundMessages : 0;

      // Determine preferred hours (most common response hours)
      const hourCounts: { [hour: number]: number } = {};
      preferredHours.forEach(hour => {
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });

      patterns.preferredHours = Object.entries(hourCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([hour]) => parseInt(hour));

      return patterns;
    } catch (error) {
      console.error('Error getting response patterns:', error);
      return {
        preferredHours: [],
        averageResponseTime: 24,
        responseRate: 0,
        totalConversations: 0
      };
    }
  }

  // Get current message frequency to prevent over-messaging
  private async getCurrentMessageFrequency(leadId: string) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: todayMessages } = await supabase
        .from('conversations')
        .select('id')
        .eq('lead_id', leadId)
        .eq('direction', 'out')
        .gte('sent_at', today.toISOString());

      // Get last message time
      const { data: lastMessage } = await supabase
        .from('conversations')
        .select('sent_at')
        .eq('lead_id', leadId)
        .eq('direction', 'out')
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const hoursSinceLastMessage = lastMessage 
        ? (Date.now() - new Date(lastMessage.sent_at).getTime()) / (1000 * 60 * 60)
        : 999;

      return {
        todayCount: todayMessages?.length || 0,
        hoursSinceLastMessage
      };
    } catch (error) {
      console.error('Error getting message frequency:', error);
      return {
        todayCount: 0,
        hoursSinceLastMessage: 999
      };
    }
  }

  // Get base timing hours based on message type and urgency
  private getBaseTimingHours(messageType: string, urgencyLevel: string): number {
    const timingMatrix: { [key: string]: { [key: string]: number } } = {
      initial: { low: 1, normal: 0.5, high: 0 }, // Initial contact timing
      follow_up: { low: 48, normal: 24, high: 4 }, // Follow-up timing
      nurture: { low: 168, normal: 72, high: 24 }, // Nurture campaign timing (hours)
      closing: { low: 6, normal: 2, high: 1 } // Closing attempt timing
    };

    return timingMatrix[messageType]?.[urgencyLevel] || 24;
  }

  // Adjust timing for lead's preferred response times
  private adjustForPreferredTimes(baseHours: number, preferredHours: number[]): number {
    if (preferredHours.length === 0) return baseHours;

    const now = new Date();
    const targetTime = new Date(now.getTime() + (baseHours * 60 * 60 * 1000));
    const targetHour = targetTime.getHours();

    // If target time aligns with preferred hours, keep it
    if (preferredHours.includes(targetHour)) {
      return baseHours;
    }

    // Find nearest preferred hour
    const nearestPreferredHour = preferredHours.reduce((nearest, hour) => {
      return Math.abs(hour - targetHour) < Math.abs(nearest - targetHour) ? hour : nearest;
    });

    // Adjust to nearest preferred hour
    const adjustment = nearestPreferredHour - targetHour;
    return Math.max(0.5, baseHours + adjustment); // Minimum 30 minutes
  }

  // Adjust for business hours (8 AM - 7 PM, Mon-Fri)
  private adjustForBusinessHours(date: Date): Date {
    const adjusted = new Date(date);
    const hour = adjusted.getHours();
    const day = adjusted.getDay();

    // Handle weekends
    if (day === 0) { // Sunday -> Monday 9 AM
      adjusted.setDate(adjusted.getDate() + 1);
      adjusted.setHours(9, 0, 0, 0);
    } else if (day === 6) { // Saturday -> Monday 9 AM
      adjusted.setDate(adjusted.getDate() + 2);
      adjusted.setHours(9, 0, 0, 0);
    }

    // Handle business hours
    if (hour < 8) {
      adjusted.setHours(9, 0, 0, 0);
    } else if (hour >= 19) {
      // Move to next business day at 9 AM
      adjusted.setDate(adjusted.getDate() + 1);
      adjusted.setHours(9, 0, 0, 0);
      
      // Check if next day is weekend
      if (adjusted.getDay() === 6) { // Saturday -> Monday
        adjusted.setDate(adjusted.getDate() + 2);
      } else if (adjusted.getDay() === 0) { // Sunday -> Monday
        adjusted.setDate(adjusted.getDate() + 1);
      }
    }

    return adjusted;
  }

  // Calculate confidence score for scheduling decision
  private calculateConfidence(responsePatterns: any, messageFrequency: any): number {
    let confidence = 0.5; // Base confidence

    // More confidence with more data
    if (responsePatterns.totalConversations > 10) confidence += 0.2;
    else if (responsePatterns.totalConversations > 5) confidence += 0.1;

    // Good response rate increases confidence
    if (responsePatterns.responseRate > 0.7) confidence += 0.2;
    else if (responsePatterns.responseRate > 0.4) confidence += 0.1;

    // Having preferred hours increases confidence
    if (responsePatterns.preferredHours.length > 0) confidence += 0.1;

    // Recent activity increases confidence
    if (messageFrequency.hoursSinceLastMessage < 48) confidence += 0.1;

    return Math.min(1.0, confidence);
  }

  // Generate human-readable reasoning for scheduling decision
  private generateSchedulingReasoning(
    context: SchedulingContext,
    baseHours: number,
    patterns: any,
    frequency: any,
    adjustedForBusinessHours: boolean
  ): string {
    const reasons: string[] = [];

    // Base timing reason
    reasons.push(`${context.messageType} message with ${context.urgencyLevel} urgency (${baseHours}h base timing)`);

    // Pattern-based adjustments
    if (patterns.preferredHours.length > 0) {
      reasons.push(`adjusted for preferred response times: ${patterns.preferredHours.join(', ')}:00`);
    }

    // Frequency-based adjustments
    if (frequency.todayCount >= 2) {
      reasons.push('delayed to prevent over-messaging (2+ messages today)');
    }

    // Business hours adjustment
    if (adjustedForBusinessHours) {
      reasons.push('adjusted to business hours (8 AM - 7 PM, Mon-Fri)');
    }

    // Response rate context
    if (patterns.responseRate > 0.5) {
      reasons.push(`lead typically responds within ${Math.round(patterns.averageResponseTime)}h`);
    }

    return reasons.join('; ');
  }

  // Schedule a message for optimal delivery
  async scheduleMessage(
    leadId: string,
    messageContent: string,
    context: SchedulingContext
  ): Promise<{ scheduled: boolean; scheduledFor: Date; reasoning: string }> {
    try {
      const optimalTime = await this.calculateOptimalSendTime(context);

      // If optimal time is within 15 minutes, send immediately
      const timeDiff = optimalTime.scheduledFor.getTime() - Date.now();
      if (timeDiff <= 15 * 60 * 1000) { // 15 minutes
        console.log(`📅 [SCHEDULING] Sending immediately (optimal time within 15 minutes)`);
        return {
          scheduled: false,
          scheduledFor: new Date(),
          reasoning: 'Optimal send time is now'
        };
      }

      // Queue for future delivery
      await supabase
        .from('ai_message_approval_queue')
        .insert({
          lead_id: leadId,
          message_content: messageContent,
          message_stage: context.messageType,
          urgency_level: context.urgencyLevel,
          auto_approved: true,
          approved: true,
          scheduled_send_at: optimalTime.scheduledFor.toISOString()
        });

      console.log(`📅 [SCHEDULING] Message scheduled for ${optimalTime.scheduledFor.toISOString()}`);
      
      return {
        scheduled: true,
        scheduledFor: optimalTime.scheduledFor,
        reasoning: optimalTime.reasoning
      };

    } catch (error) {
      console.error('❌ [SCHEDULING] Error scheduling message:', error);
      throw error;
    }
  }
}

export const intelligentSchedulingService = new IntelligentSchedulingService();
