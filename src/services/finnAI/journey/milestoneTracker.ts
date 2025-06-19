
import { Milestone } from './types';

export class MilestoneTracker {
  createMilestone(type: Milestone['type'], data: any): Milestone {
    return {
      id: `ms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      achievedAt: new Date(),
      data
    };
  }

  milestoneExists(milestones: Milestone[], type: Milestone['type']): boolean {
    return milestones.some(m => m.type === type);
  }
}
