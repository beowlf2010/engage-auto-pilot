
import { supabase } from '@/integrations/supabase/client';
import { TouchpointTracker } from './journey/touchpointTracker';
import type { Touchpoint } from './journey/types';

export interface JourneyInsights {
  stage: string;
  nextBestAction: string;
  conversionProbability: number;
  estimatedTimeToDecision: number;
}

class CustomerJourneyTracker {
  private touchpointTracker = new TouchpointTracker();

  async trackTouchpoint(
    leadId: string,
    type: Touchpoint['type'],
    channel: Touchpoint['channel'],
    data: any,
    outcome?: 'positive' | 'neutral' | 'negative'
  ): Promise<void> {
    try {
      console.log('📊 Tracking customer journey touchpoint:', { leadId, type, channel });
      
      const touchpoint = this.touchpointTracker.createTouchpoint(type, channel, data, outcome);
      
      // Get or create customer journey
      let { data: journey } = await supabase
        .from('customer_journeys')
        .select('*')
        .eq('lead_id', leadId)
        .single();

      if (!journey) {
        // Create new journey
        const { data: newJourney } = await supabase
          .from('customer_journeys')
          .insert({
            lead_id: leadId,
            journey_stage: 'awareness',
            touchpoints: [touchpoint],
            milestones: [],
            next_best_action: 'Send follow-up message',
            estimated_time_to_decision: 30,
            conversion_probability: 0.3
          })
          .select()
          .single();
        
        journey = newJourney;
      } else {
        // Update existing journey
        const updatedTouchpoints = [...(journey.touchpoints || []), touchpoint];
        const updatedStage = this.determineJourneyStage(updatedTouchpoints);
        
        await supabase
          .from('customer_journeys')
          .update({
            touchpoints: updatedTouchpoints,
            journey_stage: updatedStage,
            updated_at: new Date().toISOString(),
            conversion_probability: this.calculateConversionProbability(updatedTouchpoints)
          })
          .eq('lead_id', leadId);
      }

      console.log('✅ Journey touchpoint tracked successfully');
    } catch (error) {
      console.error('❌ Error tracking journey touchpoint:', error);
    }
  }

  async getJourneyInsights(leadId: string): Promise<JourneyInsights> {
    try {
      const { data: journey } = await supabase
        .from('customer_journeys')
        .select('*')
        .eq('lead_id', leadId)
        .single();

      if (journey) {
        return {
          stage: journey.journey_stage,
          nextBestAction: journey.next_best_action,
          conversionProbability: journey.conversion_probability,
          estimatedTimeToDecision: journey.estimated_time_to_decision
        };
      }

      // Return default insights
      return {
        stage: 'awareness',
        nextBestAction: 'Send follow-up message',
        conversionProbability: 0.3,
        estimatedTimeToDecision: 30
      };
    } catch (error) {
      console.error('❌ Error getting journey insights:', error);
      return {
        stage: 'awareness',
        nextBestAction: 'Send follow-up message',
        conversionProbability: 0.3,
        estimatedTimeToDecision: 30
      };
    }
  }

  private determineJourneyStage(touchpoints: Touchpoint[]): string {
    const recentTouchpoints = touchpoints.slice(-5);
    
    if (recentTouchpoints.some(t => t.type === 'appointment' || t.type === 'test_drive')) {
      return 'decision';
    }
    
    if (recentTouchpoints.filter(t => t.type === 'customer_message').length > 3) {
      return 'consideration';
    }
    
    return 'awareness';
  }

  private calculateConversionProbability(touchpoints: Touchpoint[]): number {
    let probability = 0.3; // Base probability
    
    // Increase based on engagement
    const positiveOutcomes = touchpoints.filter(t => t.outcome === 'positive').length;
    const totalOutcomes = touchpoints.filter(t => t.outcome).length;
    
    if (totalOutcomes > 0) {
      const positiveRate = positiveOutcomes / totalOutcomes;
      probability += positiveRate * 0.4;
    }
    
    // Increase based on high-value touchpoints
    if (touchpoints.some(t => t.type === 'test_drive')) probability += 0.3;
    if (touchpoints.some(t => t.type === 'appointment')) probability += 0.2;
    
    return Math.min(0.95, Math.max(0.05, probability));
  }
}

export const customerJourneyTracker = new CustomerJourneyTracker();
