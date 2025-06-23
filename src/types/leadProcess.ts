
export interface LeadProcess {
  id: string;
  name: string;
  description: string;
  aggressionLevel: 'gentle' | 'moderate' | 'aggressive' | 'super_aggressive';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  messageSequence: ProcessMessage[];
  escalationRules: EscalationRule[];
  successCriteria: SuccessCriteria;
  performanceMetrics: ProcessPerformanceMetrics;
}

export interface ProcessMessage {
  id: string;
  sequenceNumber: number;
  delayHours: number; // Hours from previous message or lead creation
  messageTemplate: string;
  tone: 'professional' | 'friendly' | 'urgent' | 'casual';
  channel: 'sms' | 'email' | 'both';
  conditions?: MessageCondition[];
}

export interface MessageCondition {
  type: 'time_of_day' | 'day_of_week' | 'lead_source' | 'vehicle_type';
  value: string;
  operator: 'equals' | 'not_equals' | 'contains';
}

export interface EscalationRule {
  id: string;
  triggerType: 'no_response' | 'negative_response' | 'time_based';
  triggerValue: number; // Hours or score threshold
  action: 'escalate_process' | 'assign_human' | 'pause_automation';
  targetProcessId?: string;
}

export interface SuccessCriteria {
  responseRate: number; // Minimum response rate to consider successful
  appointmentRate: number; // Minimum appointment booking rate
  conversionRate: number; // Minimum conversion to sale rate
  maxDaysToConversion: number; // Maximum days to consider conversion
}

export interface ProcessPerformanceMetrics {
  totalLeadsAssigned: number;
  totalResponses: number;
  totalAppointments: number;
  totalConversions: number;
  averageResponseTime: number; // Hours
  averageTimeToConversion: number; // Days
  responseRate: number;
  appointmentRate: number;
  conversionRate: number;
  costPerConversion: number;
  lastUpdated: string;
}

export interface LeadProcessAssignment {
  id: string;
  leadId: string;
  processId: string;
  assignedAt: string;
  currentStage: number;
  nextMessageAt?: string;
  status: 'active' | 'paused' | 'completed' | 'escalated';
  performanceNotes?: string;
}

export interface ProcessComparison {
  processA: LeadProcess;
  processB: LeadProcess;
  statisticalSignificance: number;
  sampleSize: number;
  winner?: 'A' | 'B' | 'inconclusive';
  confidenceLevel: number;
}
