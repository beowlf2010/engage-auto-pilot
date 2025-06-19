
import { CustomerJourney } from './types';

export class ProbabilityCalculator {
  calculateConversionProbability(journey: CustomerJourney): number {
    let probability = 0.3;

    switch (journey.journeyStage) {
      case 'awareness': probability = 0.2; break;
      case 'consideration': probability = 0.5; break;
      case 'decision': probability = 0.8; break;
      case 'purchase': probability = 0.95; break;
    }

    const recentTouchpoints = journey.touchpoints.slice(-5);
    const avgEngagement = recentTouchpoints.length > 0 
      ? recentTouchpoints.reduce((sum, tp) => sum + tp.engagement_score, 0) / recentTouchpoints.length
      : 0.5;
    
    probability += (avgEngagement - 0.5) * 0.3;

    const milestoneBonus = journey.milestones.length * 0.05;
    probability += milestoneBonus;

    const daysSinceLastTouchpoint = journey.touchpoints.length > 0
      ? (Date.now() - journey.touchpoints[journey.touchpoints.length - 1].timestamp.getTime()) / (1000 * 60 * 60 * 24)
      : 30;
    
    if (daysSinceLastTouchpoint > 7) probability -= 0.1;
    if (daysSinceLastTouchpoint > 14) probability -= 0.2;

    return Math.min(0.98, Math.max(0.02, probability));
  }

  estimateTimeToDecision(journey: CustomerJourney): number {
    let estimatedDays = 30;

    switch (journey.journeyStage) {
      case 'awareness': estimatedDays = 45; break;
      case 'consideration': estimatedDays = 21; break;
      case 'decision': estimatedDays = 7; break;
      case 'purchase': estimatedDays = 1; break;
    }

    const recentTouchpoints = journey.touchpoints.slice(-5);
    const avgEngagement = recentTouchpoints.length > 0 
      ? recentTouchpoints.reduce((sum, tp) => sum + tp.engagement_score, 0) / recentTouchpoints.length
      : 0.5;
    
    if (avgEngagement > 0.7) estimatedDays *= 0.7;
    else if (avgEngagement < 0.3) estimatedDays *= 1.5;

    return Math.max(1, Math.round(estimatedDays));
  }
}
