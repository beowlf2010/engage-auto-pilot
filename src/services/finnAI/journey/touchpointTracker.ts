
import { Touchpoint } from './types';

export class TouchpointTracker {
  calculateEngagementScore(
    type: Touchpoint['type'],
    data: any,
    outcome?: 'positive' | 'neutral' | 'negative'
  ): number {
    let baseScore = 0.5;

    switch (type) {
      case 'website_visit':
        baseScore = 0.3;
        if (data.timeSpent > 120) baseScore += 0.2;
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
        if (data.duration > 300) baseScore += 0.2;
        break;
      case 'appointment':
        baseScore = 0.9;
        break;
      case 'test_drive':
        baseScore = 0.95;
        break;
    }

    if (outcome === 'positive') baseScore += 0.2;
    else if (outcome === 'negative') baseScore -= 0.3;

    return Math.min(1, Math.max(0, baseScore));
  }

  createTouchpoint(
    type: Touchpoint['type'],
    channel: Touchpoint['channel'],
    data: any,
    outcome?: 'positive' | 'neutral' | 'negative'
  ): Touchpoint {
    return {
      id: `tp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: new Date(),
      channel,
      data,
      engagement_score: this.calculateEngagementScore(type, data, outcome),
      outcome
    };
  }
}
