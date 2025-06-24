
export type SourceBucket = 
  | 'marketplace'
  | 'oem_gm_finance'
  | 'chat_widgets'
  | 'website_forms'
  | 'paid_ads_social'
  | 'phone_up'
  | 'walk_in'
  | 'referral_repeat'
  | 'trade_in_tools'
  | 'other_unknown';

export type LeadTypeId = 
  | 'retail_1'
  | 'finance_2'
  | 'insurance_3'
  | 'commercial_4'
  | 'trade_in_5'
  | 'service_6';

export type LeadStatusNormalized = 
  | 'new'
  | 'working'
  | 'purchased'
  | 'lost'
  | 'lost_brief'
  | 'appt_set'
  | 'appt_done';

export interface SourceBucketConfig {
  name: string;
  sourcePatterns: string[];
  aggression: 1 | 2 | 3 | 4 | 5;
  tone: string;
  voice: string;
  primaryCTA: string;
}

export interface LeadTypeOverlay {
  id: LeadTypeId;
  name: string;
  talkingPoint: string;
  typicalCTA: string;
}

export interface StatusRule {
  status: LeadStatusNormalized;
  voice: string;
  objective: string;
}

export interface EnhancedProcessTemplate {
  id: string;
  name: string;
  sourceBucket: SourceBucket;
  leadType?: LeadTypeId;
  aggression: 1 | 2 | 3 | 4 | 5;
  messageSequence: EnhancedProcessMessage[];
  statusRules: StatusRule[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EnhancedProcessMessage {
  id: string;
  sequenceNumber: number;
  delayHours: number;
  messageTemplate: string;
  maxCharacters: number;
  maxEmojis: number;
  tone: string;
  aggressionLevel: 1 | 2 | 3 | 4 | 5;
  statusContext: LeadStatusNormalized[];
  sendWindowStart: string; // "08:00"
  sendWindowEnd: string; // "19:00"
  timezone: string; // "America/Chicago"
}

export interface ProcessAssignmentLogic {
  sourceBucket: SourceBucket;
  leadType: LeadTypeId;
  status: LeadStatusNormalized;
  recommendedProcessId: string;
  confidence: number;
}
