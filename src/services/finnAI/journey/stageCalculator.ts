
import { CustomerJourney, Touchpoint, Milestone } from './types';

export class StageCalculator {
  determineJourneyStage(touchpoints: Touchpoint[]): CustomerJourney['journeyStage'] {
    const recentTouchpoints = touchpoints.slice(-10);
    
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

  determineJourneyStageFromMilestones(milestones: Milestone[]): CustomerJourney['journeyStage'] {
    if (milestones.some(m => m.type === 'contract_signed')) return 'purchase';
    if (milestones.some(m => m.type === 'offer_made')) return 'decision';
    if (milestones.some(m => m.type === 'test_drive_scheduled')) return 'decision';
    if (milestones.some(m => m.type === 'financing_discussion')) return 'consideration';
    if (milestones.some(m => m.type === 'price_inquiry')) return 'consideration';
    if (milestones.some(m => m.type === 'vehicle_interest')) return 'consideration';
    return 'awareness';
  }
}
