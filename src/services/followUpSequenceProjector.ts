import { supabase } from '@/integrations/supabase/client';
import { addHours, differenceInHours } from 'date-fns';

// Message intent templates for different stages
const MESSAGE_INTENTS = {
  0: 'Initial Contact',
  1: 'Quick Check-in',
  2: 'Value Proposition',
  3: 'Specific Vehicle Options',
  7: 'Test Drive Invitation',
  14: 'Urgency Introduction',
  21: 'Alternative Options',
  30: 'Re-engagement Attempt'
};

// Source-specific cadence patterns (in hours from opt-in)
const CADENCE_PATTERNS: Record<string, number[]> = {
  'aggressive_24h': [0, 8, 16, 32, 56, 120],        // 3 in first 24h, then spread
  'web': [0, 72, 168, 336, 504, 720],               // Days: 0, 3, 7, 14, 21, 30
  'dealer_chat': [0, 24, 120, 240, 360],            // Days: 0, 1, 5, 10, 15
  'bdc_transfer': [0, 24, 96, 168, 336],            // Days: 0, 1, 4, 7, 14
  'walk_in': [0, 72, 168, 336],                     // Days: 0, 3, 7, 14
  'phone': [0, 24, 120, 240, 480],                  // Days: 0, 1, 5, 10, 20
  'default': [0, 72, 168, 336, 504]                 // Days: 0, 3, 7, 14, 21
};

export interface ProjectedTouch {
  day: number;
  scheduledFor: Date;
  messageIntent: string;
  strategy: string;
  sourcePattern: string;
  confidenceScore: number;
  expectedOutcome: string;
  automatable: boolean;
  engagementPrediction: number;
}

export interface ProjectedSequence {
  leadId: string;
  leadName: string;
  currentStage: string;
  source: string;
  cadencePattern: string;
  touches: ProjectedTouch[];
  totalDuration: number;
  conversionProbability: number;
  lastUpdated: Date;
  isCustomSchedule?: boolean;
}

export const projectFollowUpSequence = async (
  leadId: string,
  options: {
    includeHistory?: boolean;
    projectionDays?: number;
    customCadence?: number[];
    customCadencePattern?: string;
  } = {}
): Promise<ProjectedSequence> => {
  // Fetch lead data
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single();

  if (leadError || !lead) {
    throw new Error('Lead not found');
  }

  // Fetch conversation history
  const { data: conversations } = await supabase
    .from('conversations')
    .select('*')
    .eq('lead_id', leadId)
    .order('sent_at', { ascending: false })
    .limit(10);

  // Fetch AI score if available
  const { data: scoreData } = await supabase
    .from('ai_lead_scores')
    .select('*')
    .eq('lead_id', leadId)
    .single();

  // Determine cadence pattern based on source or custom override
  const sourceKey = options.customCadencePattern || mapSourceToCadence(lead.source || 'unknown');
  const cadenceHours = options.customCadence || CADENCE_PATTERNS[sourceKey] || CADENCE_PATTERNS.default;
  const isCustomSchedule = !!(options.customCadence || options.customCadencePattern);

  // Determine starting point
  const startDate = lead.next_ai_send_at ? new Date(lead.next_ai_send_at) : new Date();
  
  // Generate touches based on cadence
  const touches: ProjectedTouch[] = cadenceHours.map((hours, index) => {
    const scheduledFor = addHours(startDate, hours);
    const day = Math.ceil(hours / 24);
    
    return {
      day,
      scheduledFor,
      messageIntent: getMessageIntent(day, lead.source),
      strategy: getStrategy(day, lead.source, index, cadenceHours.length),
      sourcePattern: sourceKey,
      confidenceScore: calculateConfidence(day, index, conversations?.length || 0),
      expectedOutcome: getExpectedOutcome(day, lead.source),
      automatable: day <= 14, // First 14 days are automatable
      engagementPrediction: predictEngagement(day, scoreData?.engagement_level || 'low')
    };
  });

  // Adjust for engagement if we have conversation history
  const responsiveConversations = conversations?.filter(c => 
    c.direction === 'in' && 
    differenceInHours(new Date(), new Date(c.sent_at)) < 48
  );

  if (responsiveConversations && responsiveConversations.length > 0) {
    // Lead is responsive - adjust confidence scores up
    touches.forEach(t => {
      t.confidenceScore = Math.min(0.95, t.confidenceScore * 1.2);
      t.engagementPrediction = Math.min(0.85, t.engagementPrediction * 1.15);
    });
  }

  return {
    leadId: lead.id,
    leadName: `${lead.first_name} ${lead.last_name}`,
    currentStage: getCurrentStage(lead, conversations || []),
    source: lead.source || 'unknown',
    cadencePattern: sourceKey,
    touches,
    totalDuration: Math.max(...touches.map(t => t.day)),
    conversionProbability: calculateConversionProbability(lead, conversations || []),
    lastUpdated: new Date(),
    isCustomSchedule
  };
};

function mapSourceToCadence(source: string): string {
  const sourceLower = source.toLowerCase();
  if (sourceLower.includes('web') || sourceLower.includes('online')) return 'web';
  if (sourceLower.includes('chat')) return 'dealer_chat';
  if (sourceLower.includes('bdc') || sourceLower.includes('transfer')) return 'bdc_transfer';
  if (sourceLower.includes('walk')) return 'walk_in';
  if (sourceLower.includes('phone') || sourceLower.includes('call')) return 'phone';
  return 'default';
}

function getMessageIntent(day: number, source?: string): string {
  // Find closest intent
  const days = Object.keys(MESSAGE_INTENTS).map(Number).sort((a, b) => a - b);
  const closestDay = days.reduce((prev, curr) => 
    Math.abs(curr - day) < Math.abs(prev - day) ? curr : prev
  );
  return MESSAGE_INTENTS[closestDay as keyof typeof MESSAGE_INTENTS] || 'Follow-up';
}

function getStrategy(day: number, source: string | undefined, index: number, total: number): string {
  if (day === 0) return 'Establish initial contact and build rapport';
  if (day <= 2) return 'Strike while interest is fresh';
  if (day <= 7) return 'Transition to consideration stage with specific options';
  if (day <= 14) return 'Move toward test drive or appointment';
  if (day <= 21) return 'Create urgency and address objections';
  return 'Re-engagement attempt with new angle';
}

function getExpectedOutcome(day: number, source: string | undefined): string {
  if (day === 0) return 'Acknowledge interest and set expectations';
  if (day <= 2) return 'Get response and understand needs';
  if (day <= 7) return 'Present vehicles and gauge interest level';
  if (day <= 14) return 'Schedule test drive or appointment';
  if (day <= 21) return 'Close the deal or identify barriers';
  return 'Revive interest or identify if lead is still active';
}

function calculateConfidence(day: number, index: number, conversationCount: number): number {
  let base = 0.9 - (index * 0.05); // Decreases over time
  
  // First touch is always high confidence
  if (day === 0) return 0.92;
  
  // Boost if we have conversation history
  if (conversationCount > 0) {
    base += 0.1;
  }
  
  // Decrease confidence for later touches
  if (day > 14) base -= 0.15;
  if (day > 21) base -= 0.2;
  
  return Math.max(0.3, Math.min(0.95, base));
}

function predictEngagement(day: number, engagementLevel: string): number {
  let base = 0.5;
  
  // Adjust for engagement level
  if (engagementLevel === 'high') base = 0.7;
  if (engagementLevel === 'medium') base = 0.55;
  if (engagementLevel === 'low') base = 0.35;
  
  // Earlier touches have higher engagement
  if (day <= 2) base += 0.15;
  if (day <= 7) base += 0.05;
  
  // Later touches have lower engagement
  if (day > 14) base -= 0.15;
  if (day > 21) base -= 0.2;
  
  return Math.max(0.1, Math.min(0.9, base));
}

function getCurrentStage(lead: any, conversations: any[]): string {
  if (!conversations || conversations.length === 0) return 'Initial Contact';
  
  const recentMessages = conversations.slice(0, 3);
  const hasResponse = recentMessages.some(c => c.direction === 'in');
  
  if (!hasResponse) return 'Awaiting Response';
  if (conversations.length < 3) return 'Early Engagement';
  if (conversations.length < 7) return 'Active Conversation';
  
  return 'Advanced Discussion';
}

function calculateConversionProbability(lead: any, conversations: any[]): number {
  let probability = 0.5;
  
  // Boost for AI opt-in
  if (lead.ai_opt_in) probability += 0.1;
  
  // Boost for conversation activity
  const inboundMessages = conversations.filter(c => c.direction === 'in').length;
  probability += Math.min(0.3, inboundMessages * 0.05);
  
  // Boost for recent activity
  if (lead.last_reply_at) {
    const hoursSinceReply = differenceInHours(new Date(), new Date(lead.last_reply_at));
    if (hoursSinceReply < 24) probability += 0.15;
    else if (hoursSinceReply < 72) probability += 0.05;
  }
  
  return Math.min(0.95, probability);
}
