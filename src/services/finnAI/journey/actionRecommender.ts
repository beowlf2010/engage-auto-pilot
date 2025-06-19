
import { CustomerJourney } from './types';

export class ActionRecommender {
  determineNextBestAction(journey: CustomerJourney): string {
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
}
