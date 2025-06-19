
import { supabase } from '@/integrations/supabase/client';

export interface CustomerJourney {
  leadId: string;
  journeyStage: 'awareness' | 'consideration' | 'decision' | 'purchase' | 'advocacy';
  touchpoints: Touchpoint[];
  milestones: Milestone[];
  nextBestAction: string;
  estimatedTimeToDecision: number; // days
  conversionProbability: number; // 0-1
  lastUpdated: Date;
}

export interface Touchpoint {
  id: string;
  type: 'website_visit' | 'email_open' | 'sms_reply' | 'phone_call' | 'appointment' | 'test_drive';
  timestamp: Date;
  channel: 'web' | 'email' | 'sms' | 'phone' | 'in_person';
  data: any;
  engagement_score: number; // 0-1
  outcome?: 'positive' | 'neutral' | 'negative';
}

export interface Milestone {
  id: string;
  type: 'first_contact' | 'vehicle_interest' | 'price_inquiry' | 'financing_discussion' | 'test_drive_scheduled' | 'offer_made' | 'contract_signed';
  achievedAt: Date;
  data: any;
}

// Type guard functions
const isTouchpointArray = (data: any): data is Touchpoint[] => {
  return Array.isArray(data);
};

const isMilestoneArray = (data: any): data is Milestone[] => {
  return Array.isArray(data);
};

class CustomerJourneyTracker {
  // Track new touchpoint in customer journey
  async trackTouchpoint(
    leadId: string,
    type: Touchpoint['type'],
    channel: Touchpoint['channel'],
    data: any,
    outcome?: 'positive' | 'neutral' | 'negative'
  ): Promise<void> {
    const journey = await this.getCustomerJourney(leadId);
    
    const touchpoint: Touchpoint = {
      id: `tp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: new Date(),
      channel,
      data,
      engagement_score: this.calculateEngagementScore(type, data, outcome),
      outcome
    };

    journey.touchpoints.push(touchpoint);
    
    // Update journey stage based on touchpoint
    journey.journeyStage = this.determineJourneyStage(journey.touchpoints);
    
    // Update conversion probability
    journey.conversionProbability = this.calculateConversionProbability(journey);
    
    // Update estimated time to decision
    journey.estimatedTimeToDecision = this.estimateTimeToDecision(journey);
    
    // Determine next best action
    journey.nextBestAction = this.determineNextBestAction(journey);

    await this.saveJourney(journey);
  }

  // Track milestone achievement
  async trackMilestone(
    leadId: string,
    type: Milestone['type'],
    data: any
  ): Promise<void> {
    const journey = await this.getCustomerJourney(leadId);
    
    // Check if milestone already exists
    const existingMilestone = journey.milestones.find(m => m.type === type);
    if (existingMilestone) return;

    const milestone: Milestone = {
      id: `ms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      achievedAt: new Date(),
      data
    };

    journey.milestones.push(milestone);
    
    // Update journey stage based on milestone
    journey.journeyStage = this.determineJourneyStageFromMilestones(journey.milestones);
    
    await this.saveJourney(journey);
  }

  // Get customer journey - using the new customer_journeys table
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
          touchpoints: isTouchpointArray(journey.touchpoints) ? journey.touchpoints : [],
          milestones: isMilestoneArray(journey.milestones) ? journey.milestones : [],
          nextBestAction: journey.next_best_action || '',
          estimatedTimeToDecision: journey.estimated_time_to_decision || 30,
          conversionProbability: journey.conversion_probability || 0.5,
          lastUpdated: new Date(journey.updated_at)
        };
      }
    } catch (error) {
      console.log('Creating new customer journey for lead:', leadId);
    }

    // Create new journey
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

  // Calculate engagement score for touchpoint
  private calculateEngagementScore(
    type: Touchpoint['type'],
    data: any,
    outcome?: 'positive' | 'neutral' | 'negative'
  ): number {
    let baseScore = 0.5;

    // Score by type
    switch (type) {
      case 'website_visit':
        baseScore = 0.3;
        if (data.timeSpent > 120) baseScore += 0.2; // 2+ minutes
        if (data.pagesViewed > 3) baseScore += 0.2;
        break;
      case 'email_open':
        baseScore = 0.4;
        if (data.clickedLinks) baseScore += 0.3;
        break;
      case 'sms_reply':
        baseScore = 0.7;
        if (data.messageLength > 50) baseScore += 0.2;
        break;
      case 'phone_call':
        baseScore = 0.8;
        if (data.duration > 300) baseScore += 0.2; // 5+ minutes
        break;
      case 'appointment':
        baseScore = 0.9;
        break;
      case 'test_drive':
        baseScore = 0.95;
        break;
    }

    // Adjust by outcome
    if (outcome === 'positive') baseScore += 0.2;
    else if (outcome === 'negative') baseScore -= 0.3;

    return Math.min(1, Math.max(0, baseScore));
  }

  // Determine journey stage from touchpoints
  private determineJourneyStage(touchpoints: Touchpoint[]): CustomerJourney['journeyStage'] {
    const recentTouchpoints = touchpoints.slice(-10); // Last 10 touchpoints
    
    const hasTestDrive = recentTouchpoints.some(tp => tp.type === 'test_drive');
    const hasAppointment = recentTouchpoints.some(tp => tp.type === 'appointment');
    const hasPhoneCall = recentTouchpoints.some(tp => tp.type === 'phone_call');
    const hasPriceInquiry = recentTouchpoints.some(tp => 
      tp.data?.content?.toLowerCase().includes('price') || 
      tp.data?.content?.toLowerCase().includes('cost')
    );

    if (hasTestDrive) return 'decision';
    if (hasAppointment || hasPhoneCall) return 'consideration';
    if (hasPriceInquiry) return 'consideration';
    
    const engagementLevel = recentTouchpoints.reduce((sum, tp) => sum + tp.engagement_score, 0) / recentTouchpoints.length;
    if (engagementLevel > 0.6) return 'consideration';
    
    return 'awareness';
  }

  // Determine journey stage from milestones
  private determineJourneyStageFromMilestones(milestones: Milestone[]): CustomerJourney['journeyStage'] {
    if (milestones.some(m => m.type === 'contract_signed')) return 'purchase';
    if (milestones.some(m => m.type === 'offer_made')) return 'decision';
    if (milestones.some(m => m.type === 'test_drive_scheduled')) return 'decision';
    if (milestones.some(m => m.type === 'financing_discussion')) return 'consideration';
    if (milestones.some(m => m.type === 'price_inquiry')) return 'consideration';
    if (milestones.some(m => m.type === 'vehicle_interest')) return 'consideration';
    return 'awareness';
  }

  // Calculate conversion probability
  private calculateConversionProbability(journey: CustomerJourney): number {
    let probability = 0.3; // Base probability

    // Journey stage impact
    switch (journey.journeyStage) {
      case 'awareness': probability = 0.2; break;
      case 'consideration': probability = 0.5; break;
      case 'decision': probability = 0.8; break;
      case 'purchase': probability = 0.95; break;
    }

    // Engagement impact
    const recentTouchpoints = journey.touchpoints.slice(-5);
    const avgEngagement = recentTouchpoints.length > 0 
      ? recentTouchpoints.reduce((sum, tp) => sum + tp.engagement_score, 0) / recentTouchpoints.length
      : 0.5;
    
    probability += (avgEngagement - 0.5) * 0.3;

    // Milestone impact
    const milestoneBonus = journey.milestones.length * 0.05;
    probability += milestoneBonus;

    // Recency impact
    const daysSinceLastTouchpoint = journey.touchpoints.length > 0
      ? (Date.now() - journey.touchpoints[journey.touchpoints.length - 1].timestamp.getTime()) / (1000 * 60 * 60 * 24)
      : 30;
    
    if (daysSinceLastTouchpoint > 7) probability -= 0.1;
    if (daysSinceLastTouchpoint > 14) probability -= 0.2;

    return Math.min(0.98, Math.max(0.02, probability));
  }

  // Estimate time to decision
  private estimateTimeToDecision(journey: CustomerJourney): number {
    let estimatedDays = 30; // Default

    switch (journey.journeyStage) {
      case 'awareness': estimatedDays = 45; break;
      case 'consideration': estimatedDays = 21; break;
      case 'decision': estimatedDays = 7; break;
      case 'purchase': estimatedDays = 1; break;
    }

    // Adjust based on engagement
    const recentTouchpoints = journey.touchpoints.slice(-5);
    const avgEngagement = recentTouchpoints.length > 0 
      ? recentTouchpoints.reduce((sum, tp) => sum + tp.engagement_score, 0) / recentTouchpoints.length
      : 0.5;
    
    if (avgEngagement > 0.7) estimatedDays *= 0.7; // Faster decision
    else if (avgEngagement < 0.3) estimatedDays *= 1.5; // Slower decision

    return Math.max(1, Math.round(estimatedDays));
  }

  // Determine next best action
  private determineNextBestAction(journey: CustomerJourney): string {
    const daysSinceLastTouchpoint = journey.touchpoints.length > 0
      ? (Date.now() - journey.touchpoints[journey.touchpoints.length - 1].timestamp.getTime()) / (1000 * 60 * 60 * 24)
      : 0;

    switch (journey.journeyStage) {
      case 'awareness':
        if (daysSinceLastTouchpoint > 3) return 'Send educational content about vehicle features';
        return 'Follow up with vehicle information';
        
      case 'consideration':
        const hasPhoneCall = journey.touchpoints.some(tp => tp.type === 'phone_call');
        if (!hasPhoneCall) return 'Schedule phone consultation';
        
        const hasAppointment = journey.milestones.some(m => m.type === 'test_drive_scheduled');
        if (!hasAppointment) return 'Invite for test drive';
        
        return 'Provide financing options';
        
      case 'decision':
        const hasOffer = journey.milestones.some(m => m.type === 'offer_made');
        if (!hasOffer) return 'Prepare personalized offer';
        
        if (daysSinceLastTouchpoint > 2) return 'Follow up on pending offer';
        return 'Address any remaining concerns';
        
      case 'purchase':
        return 'Complete paperwork and delivery arrangements';
        
      default:
        return 'Continue nurturing relationship';
    }
  }

  // Save journey to database - using the new customer_journeys table
  private async saveJourney(journey: CustomerJourney): Promise<void> {
    try {
      const { error } = await supabase
        .from('customer_journeys')
        .upsert([{
          lead_id: journey.leadId,
          journey_stage: journey.journeyStage,
          touchpoints: journey.touchpoints,
          milestones: journey.milestones,
          next_best_action: journey.nextBestAction,
          estimated_time_to_decision: journey.estimatedTimeToDecision,
          conversion_probability: journey.conversionProbability,
          updated_at: new Date().toISOString()
        }]);

      if (error) {
        console.error('Error saving customer journey:', error);
      }
    } catch (error) {
      console.error('Error saving customer journey:', error);
    }
  }

  // Get journey insights for AI
  async getJourneyInsights(leadId: string): Promise<{
    stage: string;
    probability: number;
    nextAction: string;
    urgency: 'low' | 'medium' | 'high';
    keyTouchpoints: Touchpoint[];
  }> {
    const journey = await this.getCustomerJourney(leadId);
    
    let urgency: 'low' | 'medium' | 'high' = 'medium';
    if (journey.conversionProbability > 0.7) urgency = 'high';
    else if (journey.conversionProbability < 0.4) urgency = 'low';

    const keyTouchpoints = journey.touchpoints
      .filter(tp => tp.engagement_score > 0.6)
      .slice(-3); // Last 3 high-engagement touchpoints

    return {
      stage: journey.journeyStage,
      probability: journey.conversionProbability,
      nextAction: journey.nextBestAction,
      urgency,
      keyTouchpoints
    };
  }
}

export const customerJourneyTracker = new CustomerJourneyTracker();
