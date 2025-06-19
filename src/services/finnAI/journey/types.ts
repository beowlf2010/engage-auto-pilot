
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
