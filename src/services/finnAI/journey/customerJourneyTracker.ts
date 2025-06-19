
import { CustomerJourney, Touchpoint, Milestone } from './types';
import { TouchpointTracker } from './touchpointTracker';
import { MilestoneTracker } from './milestoneTracker';
import { StageCalculator } from './stageCalculator';
import { ProbabilityCalculator } from './probabilityCalculator';
import { ActionRecommender } from './actionRecommender';
import { JourneyStore } from './journeyStore';

class CustomerJourneyTracker {
  private touchpointTracker = new TouchpointTracker();
  private milestoneTracker = new MilestoneTracker();
  private stageCalculator = new StageCalculator();
  private probabilityCalculator = new ProbabilityCalculator();
  private actionRecommender = new ActionRecommender();
  private journeyStore = new JourneyStore();

  async trackTouchpoint(
    leadId: string,
    type: Touchpoint['type'],
    channel: Touchpoint['channel'],
    data: any,
    outcome?: 'positive' | 'neutral' | 'negative'
  ): Promise<void> {
    const journey = await this.journeyStore.getCustomerJourney(leadId);
    
    const touchpoint = this.touchpointTracker.createTouchpoint(type, channel, data, outcome);
    journey.touchpoints.push(touchpoint);
    
    journey.journeyStage = this.stageCalculator.determineJourneyStage(journey.touchpoints);
    journey.conversionProbability = this.probabilityCalculator.calculateConversionProbability(journey);
    journey.estimatedTimeToDecision = this.probabilityCalculator.estimateTimeToDecision(journey);
    journey.nextBestAction = this.actionRecommender.determineNextBestAction(journey);

    await this.journeyStore.saveJourney(journey);
  }

  async trackMilestone(
    leadId: string,
    type: Milestone['type'],
    data: any
  ): Promise<void> {
    const journey = await this.journeyStore.getCustomerJourney(leadId);
    
    if (this.milestoneTracker.milestoneExists(journey.milestones, type)) return;

    const milestone = this.milestoneTracker.createMilestone(type, data);
    journey.milestones.push(milestone);
    
    journey.journeyStage = this.stageCalculator.determineJourneyStageFromMilestones(journey.milestones);
    
    await this.journeyStore.saveJourney(journey);
  }

  async getCustomerJourney(leadId: string): Promise<CustomerJourney> {
    return this.journeyStore.getCustomerJourney(leadId);
  }

  async getJourneyInsights(leadId: string): Promise<{
    stage: string;
    probability: number;
    nextAction: string;
    urgency: 'low' | 'medium' | 'high';
    keyTouchpoints: Touchpoint[];
  }> {
    const journey = await this.journeyStore.getCustomerJourney(leadId);
    
    let urgency: 'low' | 'medium' | 'high' = 'medium';
    if (journey.conversionProbability > 0.7) urgency = 'high';
    else if (journey.conversionProbability < 0.4) urgency = 'low';

    const keyTouchpoints = journey.touchpoints
      .filter(tp => tp.engagement_score > 0.6)
      .slice(-3);

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
