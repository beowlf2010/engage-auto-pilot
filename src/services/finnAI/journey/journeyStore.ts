
import { supabase } from '@/integrations/supabase/client';
import { CustomerJourney, Touchpoint, Milestone } from './types';

export class JourneyStore {
  async getCustomerJourney(leadId: string): Promise<CustomerJourney> {
    try {
      const { data: journey } = await supabase
        .from('customer_journeys')
        .select('*')
        .eq('lead_id', leadId)
        .single();

      if (journey) {
        return {
          leadId,
          journeyStage: journey.journey_stage as CustomerJourney['journeyStage'],
          touchpoints: this.parseTouchpoints(journey.touchpoints),
          milestones: this.parseMilestones(journey.milestones),
          nextBestAction: journey.next_best_action || '',
          estimatedTimeToDecision: journey.estimated_time_to_decision || 30,
          conversionProbability: journey.conversion_probability || 0.5,
          lastUpdated: new Date(journey.updated_at)
        };
      }
    } catch (error) {
      console.log('Creating new customer journey for lead:', leadId);
    }

    return {
      leadId,
      journeyStage: 'awareness',
      touchpoints: [],
      milestones: [],
      nextBestAction: 'Send welcome message',
      estimatedTimeToDecision: 30,
      conversionProbability: 0.3,
      lastUpdated: new Date()
    };
  }

  async saveJourney(journey: CustomerJourney): Promise<void> {
    try {
      const insertData = {
        lead_id: journey.leadId,
        journey_stage: journey.journeyStage,
        touchpoints: journey.touchpoints,
        milestones: journey.milestones,
        next_best_action: journey.nextBestAction,
        estimated_time_to_decision: journey.estimatedTimeToDecision,
        conversion_probability: journey.conversionProbability,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('customer_journeys')
        .upsert(insertData as any);

      if (error) {
        console.error('Error saving customer journey:', error);
      }
    } catch (error) {
      console.error('Error saving customer journey:', error);
    }
  }

  private parseTouchpoints(data: any): Touchpoint[] {
    if (!data || !Array.isArray(data)) return [];
    
    return (data as any[]).filter(this.isTouchpoint);
  }

  private parseMilestones(data: any): Milestone[] {
    if (!data || !Array.isArray(data)) return [];
    
    return (data as any[]).filter(this.isMilestone);
  }

  private isTouchpoint(data: any): data is Touchpoint {
    return data && 
           typeof data === 'object' && 
           typeof data.id === 'string' &&
           typeof data.type === 'string' &&
           typeof data.channel === 'string' &&
           data.timestamp instanceof Date || typeof data.timestamp === 'string';
  }

  private isMilestone(data: any): data is Milestone {
    return data && 
           typeof data === 'object' && 
           typeof data.id === 'string' &&
           typeof data.type === 'string' &&
           data.achievedAt instanceof Date || typeof data.achievedAt === 'string';
  }
}
