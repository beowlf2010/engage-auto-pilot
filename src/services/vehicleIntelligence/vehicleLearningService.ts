
import { supabase } from '@/integrations/supabase/client';

export interface VehicleLearningEvent {
  leadId: string;
  vehicleInterest: string;
  recognitionResult: any;
  messageStrategy: string;
  responseReceived: boolean;
  responseTime?: number;
  engagementQuality: 'high' | 'medium' | 'low';
}

export class VehicleLearningService {
  // Track vehicle-specific conversation outcomes
  async trackVehicleConversation(event: VehicleLearningEvent) {
    try {
      await supabase
        .from('ai_learning_outcomes')
        .insert({
          lead_id: event.leadId,
          outcome_type: event.responseReceived ? 'vehicle_engagement_success' : 'vehicle_message_sent',
          outcome_value: event.responseTime,
          lead_characteristics: {
            original_vehicle_interest: event.vehicleInterest,
            vehicle_recognition: event.recognitionResult,
            message_strategy: event.messageStrategy,
            engagement_quality: event.engagementQuality
          },
          conversation_quality_score: this.calculateQualityScore(event),
          seasonal_context: {
            month: new Date().getMonth() + 1,
            day_of_week: new Date().getDay(),
            hour: new Date().getHours()
          }
        });

      console.log('✅ [VEHICLE LEARNING] Tracked conversation outcome');
    } catch (error) {
      console.error('❌ [VEHICLE LEARNING] Error tracking:', error);
    }
  }

  // Learn from successful vehicle conversations
  async analyzeVehiclePatterns() {
    try {
      const { data: outcomes } = await supabase
        .from('ai_learning_outcomes')
        .select('*')
        .in('outcome_type', ['vehicle_engagement_success', 'vehicle_message_sent'])
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (!outcomes || outcomes.length === 0) return null;

      const successfulOutcomes = outcomes.filter(o => o.outcome_type === 'vehicle_engagement_success');
      const totalOutcomes = outcomes.length;
      
      const patterns = {
        overallSuccessRate: (successfulOutcomes.length / totalOutcomes) * 100,
        bestPerformingStrategies: this.analyzeStrategies(successfulOutcomes),
        mostEngagingVehicleTypes: this.analyzeVehicleTypes(successfulOutcomes),
        optimalTiming: this.analyzeOptimalTiming(successfulOutcomes),
        recommendations: this.generateRecommendations(successfulOutcomes, outcomes)
      };

      // Store insights
      await this.storeVehicleInsights(patterns);
      
      return patterns;
    } catch (error) {
      console.error('❌ [VEHICLE LEARNING] Error analyzing patterns:', error);
      return null;
    }
  }

  private calculateQualityScore(event: VehicleLearningEvent): number {
    let score = 0.5; // Base score
    
    // Boost for specific vehicle recognition
    if (event.recognitionResult?.confidence > 0.8) score += 0.3;
    else if (event.recognitionResult?.confidence > 0.5) score += 0.2;
    
    // Boost for response received
    if (event.responseReceived) score += 0.3;
    
    // Boost for quick response
    if (event.responseTime && event.responseTime < 60) score += 0.2;
    
    // Engagement quality modifier
    switch (event.engagementQuality) {
      case 'high': score += 0.2; break;
      case 'medium': score += 0.1; break;
      case 'low': score -= 0.1; break;
    }
    
    return Math.min(1.0, Math.max(0.0, score));
  }

  private analyzeStrategies(outcomes: any[]) {
    const strategies: { [key: string]: { count: number; avgQuality: number } } = {};
    
    outcomes.forEach(outcome => {
      const strategy = outcome.lead_characteristics?.message_strategy || 'unknown';
      if (!strategies[strategy]) {
        strategies[strategy] = { count: 0, avgQuality: 0 };
      }
      strategies[strategy].count++;
      strategies[strategy].avgQuality += outcome.conversation_quality_score || 0;
    });

    // Calculate averages and sort by performance
    return Object.entries(strategies)
      .map(([strategy, data]) => ({
        strategy,
        count: data.count,
        avgQuality: data.avgQuality / data.count,
        score: (data.avgQuality / data.count) * Math.log(data.count + 1) // Weight by frequency
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  private analyzeVehicleTypes(outcomes: any[]) {
    const vehicleTypes: { [key: string]: number } = {};
    
    outcomes.forEach(outcome => {
      const recognition = outcome.lead_characteristics?.vehicle_recognition;
      if (recognition?.extractedVehicle) {
        const { make, model, category } = recognition.extractedVehicle;
        const key = make && model ? `${make} ${model}` : category || 'unknown';
        vehicleTypes[key] = (vehicleTypes[key] || 0) + 1;
      }
    });

    return Object.entries(vehicleTypes)
      .map(([vehicle, count]) => ({ vehicle, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private analyzeOptimalTiming(outcomes: any[]) {
    const hourCounts: { [hour: number]: number } = {};
    const dayCounts: { [day: number]: number } = {};
    
    outcomes.forEach(outcome => {
      const seasonal = outcome.seasonal_context;
      if (seasonal?.hour !== undefined) {
        hourCounts[seasonal.hour] = (hourCounts[seasonal.hour] || 0) + 1;
      }
      if (seasonal?.day_of_week !== undefined) {
        dayCounts[seasonal.day_of_week] = (dayCounts[seasonal.day_of_week] || 0) + 1;
      }
    });

    const bestHours = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    const bestDays = Object.entries(dayCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([day]) => parseInt(day));

    return { bestHours, bestDays };
  }

  private generateRecommendations(successful: any[], all: any[]) {
    const recommendations = [];
    
    const successRate = (successful.length / all.length) * 100;
    
    if (successRate < 60) {
      recommendations.push('Consider using more specific vehicle language in messages');
    }
    
    if (successRate > 80) {
      recommendations.push('Current vehicle messaging strategy is highly effective');
    }
    
    // Analyze vehicle recognition patterns
    const highConfidenceSuccess = successful.filter(s => 
      s.lead_characteristics?.vehicle_recognition?.confidence > 0.8
    ).length;
    
    if (highConfidenceSuccess / successful.length > 0.7) {
      recommendations.push('Vehicle-specific messages perform significantly better');
    }
    
    return recommendations;
  }

  private async storeVehicleInsights(patterns: any) {
    try {
      await supabase
        .from('ai_learning_insights')
        .insert({
          insight_type: 'vehicle_intelligence',
          insight_title: 'Vehicle Conversation Analysis',
          insight_description: `Analyzed ${patterns.overallSuccessRate.toFixed(1)}% success rate with vehicle-intelligent messaging`,
          insight_data: patterns,
          confidence_score: Math.min(0.95, patterns.overallSuccessRate / 100),
          actionable: true,
          applies_globally: true
        });
    } catch (error) {
      console.error('❌ [VEHICLE LEARNING] Error storing insights:', error);
    }
  }
}

export const vehicleLearningService = new VehicleLearningService();
