
import { supabase } from '@/integrations/supabase/client';
import { 
  SourceBucket, 
  LeadTypeId, 
  LeadStatusNormalized, 
  SourceBucketConfig, 
  LeadTypeOverlay, 
  StatusRule,
  EnhancedProcessTemplate,
  ProcessAssignmentLogic
} from '@/types/enhancedLeadProcess';

// Source bucket configurations matching your system prompt
export const SOURCE_BUCKET_CONFIGS: Record<SourceBucket, SourceBucketConfig> = {
  marketplace: {
    name: 'Marketplace',
    sourcePatterns: ['autotrader.com', 'cars.com', 'cargurus', 'carfax', 'edmunds', 'truecar', 'autolist', 'credit karma'],
    aggression: 4,
    tone: 'Energetic, deal-maker, urgency',
    voice: 'High-energy sales approach',
    primaryCTA: 'Call / text to lock price/unit'
  },
  oem_gm_finance: {
    name: 'OEM / GM Finance',
    sourcePatterns: ['gm 3rd party', 'gm dealer web', 'gm financial', 'accelerate dr-standalone'],
    aggression: 3,
    tone: 'Gentle, consultative, equity-focused',
    voice: 'Professional financial advisor',
    primaryCTA: 'Review payoff / equity numbers'
  },
  chat_widgets: {
    name: 'Chat Widgets',
    sourcePatterns: ['carnow', 'fullpath/chat', 'offer assistance', 'website chat'],
    aggression: 4,
    tone: 'Real-time helper, quick answers',
    voice: 'Immediate problem solver',
    primaryCTA: "What's your next question?"
  },
  website_forms: {
    name: 'Website Forms',
    sourcePatterns: ['dealer website', 'ddc eprice', 'email lead', 'fullpath/trade in'],
    aggression: 3,
    tone: 'Friendly, professional',
    voice: 'Courteous business professional',
    primaryCTA: 'Book test drive / send e-quote'
  },
  paid_ads_social: {
    name: 'Paid Ads / Social',
    sourcePatterns: ['facebook marketplace', 'google ads call', 'iheart media'],
    aggression: 4,
    tone: 'Value-oriented, energetic',
    voice: 'Promotional deal-focused',
    primaryCTA: 'Claim online deal / offer'
  },
  phone_up: {
    name: 'Phone Up',
    sourcePatterns: ['phone up', 'call-in'],
    aggression: 5,
    tone: 'Confident, solution-oriented',
    voice: 'Direct action-taker',
    primaryCTA: 'Jump on quick call / visit'
  },
  walk_in: {
    name: 'Walk-In',
    sourcePatterns: ['walk-in', 'showroom'],
    aggression: 3,
    tone: 'Warm, personal',
    voice: 'Welcoming host',
    primaryCTA: 'Thank-you & next step'
  },
  referral_repeat: {
    name: 'Referral / Repeat',
    sourcePatterns: ['referral', 'repeat customer'],
    aggression: 2,
    tone: 'Grateful, VIP-style',
    voice: 'Appreciative relationship builder',
    primaryCTA: 'VIP treatment / loyalty perks'
  },
  trade_in_tools: {
    name: 'Trade-In Tools',
    sourcePatterns: ['kbb ico', 'fullpath/trade in', 'cargurus soft pull'],
    aggression: 4,
    tone: 'Equity-focused, helpful',
    voice: 'Value assessment expert',
    primaryCTA: 'See cash / trade value'
  },
  other_unknown: {
    name: 'Other / Unknown',
    sourcePatterns: [],
    aggression: 3,
    tone: 'Balanced, courteous',
    voice: 'Professional neutral',
    primaryCTA: 'Ask preferred next step'
  }
};

// Lead type overlays
export const LEAD_TYPE_OVERLAYS: Record<LeadTypeId, LeadTypeOverlay> = {
  retail_1: {
    id: 'retail_1',
    name: 'Retail',
    talkingPoint: 'highlight incentives / test-drive invite',
    typicalCTA: 'Schedule spin'
  },
  finance_2: {
    id: 'finance_2',
    name: 'Finance',
    talkingPoint: 'mention competitive rates / pre-approval',
    typicalCTA: 'Secure rate today'
  },
  insurance_3: {
    id: 'insurance_3',
    name: 'Insurance',
    talkingPoint: 'offer bundled savings or coverage review',
    typicalCTA: 'Review options'
  },
  commercial_4: {
    id: 'commercial_4',
    name: 'Commercial',
    talkingPoint: 'note fleet rebates or upfit options',
    typicalCTA: 'Quote for your business'
  },
  trade_in_5: {
    id: 'trade_in_5',
    name: 'Trade-In',
    talkingPoint: 'promise instant cash / equity review',
    typicalCTA: 'Send VIN/photos for value'
  },
  service_6: {
    id: 'service_6',
    name: 'Service',
    talkingPoint: 'remind of service specials',
    typicalCTA: 'Book first service visit'
  }
};

// Status normalization rules
export const STATUS_RULES: Record<LeadStatusNormalized, StatusRule> = {
  new: {
    status: 'new',
    voice: 'New',
    objective: 'Warm intro & discovery'
  },
  working: {
    status: 'working',
    voice: 'Working',
    objective: 'Drive next commitment (quote, visit, docs)'
  },
  purchased: {
    status: 'purchased',
    voice: 'Purchased',
    objective: 'Congratulate, ask for review / referral'
  },
  lost: {
    status: 'lost',
    voice: 'Lost',
    objective: 'Graceful exit; leave door open'
  },
  lost_brief: {
    status: 'lost_brief',
    voice: 'LostBrief',
    objective: 'Very brief close; re-engage only on customer ping'
  },
  appt_set: {
    status: 'appt_set',
    voice: 'ApptSet',
    objective: 'Confirm time, prep details, invite questions'
  },
  appt_done: {
    status: 'appt_done',
    voice: 'ApptDone',
    objective: 'Thank for visit; propose next action'
  }
};

class EnhancedProcessService {
  // Identify source bucket from lead source string
  identifySourceBucket(leadSource: string): SourceBucket {
    if (!leadSource) return 'other_unknown';
    
    const normalizedSource = leadSource.toLowerCase().trim();
    
    for (const [bucket, config] of Object.entries(SOURCE_BUCKET_CONFIGS)) {
      if (config.sourcePatterns.some(pattern => 
        normalizedSource.includes(pattern.toLowerCase())
      )) {
        return bucket as SourceBucket;
      }
    }
    
    return 'other_unknown';
  }

  // Normalize lead status
  normalizeLeadStatus(rawStatus: string): LeadStatusNormalized {
    if (!rawStatus) return 'new';
    
    const status = rawStatus.toLowerCase().trim();
    
    if (status === 'sold') return 'purchased';
    if (status === 'active') return 'working';
    if (status === 'lost') return 'lost';
    if (status === 'bad') return 'lost_brief';
    if (status.includes('appointment') && status.includes('set')) return 'appt_set';
    if (status.includes('appointment') && status.includes('done')) return 'appt_done';
    
    return 'new';
  }

  // Infer lead type from source if not provided
  inferLeadType(leadSource: string, explicitType?: string): LeadTypeId {
    if (explicitType) {
      const typeMap: Record<string, LeadTypeId> = {
        'retail': 'retail_1',
        'finance': 'finance_2',
        'insurance': 'insurance_3',
        'commercial': 'commercial_4',
        'trade-in': 'trade_in_5',
        'service': 'service_6'
      };
      
      const mapped = typeMap[explicitType.toLowerCase()];
      if (mapped) return mapped;
    }
    
    // Infer from source patterns
    const normalizedSource = leadSource?.toLowerCase() || '';
    
    if (normalizedSource.includes('trade')) return 'trade_in_5';
    if (normalizedSource.includes('finance') || normalizedSource.includes('credit')) return 'finance_2';
    if (normalizedSource.includes('service')) return 'service_6';
    if (normalizedSource.includes('commercial') || normalizedSource.includes('fleet')) return 'commercial_4';
    if (normalizedSource.includes('insurance')) return 'insurance_3';
    
    return 'retail_1'; // Default
  }

  // Get recommended process for a lead
  getRecommendedProcess(
    leadSource: string, 
    leadType?: string, 
    leadStatus?: string
  ): ProcessAssignmentLogic {
    const sourceBucket = this.identifySourceBucket(leadSource);
    const inferredType = this.inferLeadType(leadSource, leadType);
    const normalizedStatus = this.normalizeLeadStatus(leadStatus || 'new');
    
    // Generate process ID based on combination
    const processId = `${sourceBucket}_${inferredType}_${normalizedStatus}`;
    
    // Calculate confidence based on how well we can map the inputs
    let confidence = 0.7; // Base confidence
    
    if (leadSource && sourceBucket !== 'other_unknown') confidence += 0.2;
    if (leadType) confidence += 0.1;
    
    return {
      sourceBucket,
      leadType: inferredType,
      status: normalizedStatus,
      recommendedProcessId: processId,
      confidence: Math.min(confidence, 1.0)
    };
  }

  // Generate message template based on process logic
  generateMessageTemplate(
    sourceBucket: SourceBucket,
    leadType: LeadTypeId,
    status: LeadStatusNormalized,
    sequenceNumber: number = 1
  ): string {
    const bucketConfig = SOURCE_BUCKET_CONFIGS[sourceBucket];
    const typeOverlay = LEAD_TYPE_OVERLAYS[leadType];
    const statusRule = STATUS_RULES[status];
    
    // Base greeting patterns by aggression level
    const greetingPatterns = {
      1: "Hi {{firstName}}, hope you're well.",
      2: "Hi {{firstName}}, checking in about",
      3: "Hi {{firstName}}, wanted to follow up on",
      4: "Hi {{firstName}}, great news about",
      5: "{{firstName}}, quick update on"
    };
    
    const greeting = greetingPatterns[bucketConfig.aggression] || greetingPatterns[3];
    
    // Status-specific message body
    let messageBody = "";
    switch (status) {
      case 'new':
        messageBody = `your interest in {{vehicle}}. ${typeOverlay.talkingPoint}. ${bucketConfig.primaryCTA}?`;
        break;
      case 'working':
        messageBody = `the {{vehicle}}. ${typeOverlay.talkingPoint}. Ready to ${typeOverlay.typicalCTA.toLowerCase()}?`;
        break;
      case 'purchased':
        messageBody = `your new {{vehicle}}! Thanks for choosing us. ${typeOverlay.typicalCTA}?`;
        break;
      case 'appt_set':
        messageBody = `our appointment about {{vehicle}}. ${typeOverlay.talkingPoint}. Any questions before we meet?`;
        break;
      default:
        messageBody = `{{vehicle}}. ${typeOverlay.talkingPoint}. ${bucketConfig.primaryCTA}?`;
    }
    
    return `${greeting} ${messageBody}`.substring(0, 160); // Ensure ≤160 chars
  }

  // Create enhanced process template
  async createEnhancedProcess(
    sourceBucket: SourceBucket,
    leadType: LeadTypeId,
    status: LeadStatusNormalized = 'new'
  ): Promise<EnhancedProcessTemplate> {
    const bucketConfig = SOURCE_BUCKET_CONFIGS[sourceBucket];
    const typeOverlay = LEAD_TYPE_OVERLAYS[leadType];
    
    const processTemplate: EnhancedProcessTemplate = {
      id: `${sourceBucket}_${leadType}_${status}`,
      name: `${bucketConfig.name} - ${typeOverlay.name} (${status})`,
      sourceBucket,
      leadType,
      aggression: bucketConfig.aggression,
      messageSequence: [
        {
          id: '1',
          sequenceNumber: 1,
          delayHours: this.getDelayByAggression(bucketConfig.aggression, 1),
          messageTemplate: this.generateMessageTemplate(sourceBucket, leadType, status, 1),
          maxCharacters: 160,
          maxEmojis: 1,
          tone: bucketConfig.tone,
          aggressionLevel: bucketConfig.aggression,
          statusContext: [status],
          sendWindowStart: '08:00',
          sendWindowEnd: '19:00',
          timezone: 'America/Chicago'
        },
        {
          id: '2',
          sequenceNumber: 2,
          delayHours: this.getDelayByAggression(bucketConfig.aggression, 2),
          messageTemplate: this.generateMessageTemplate(sourceBucket, leadType, status, 2),
          maxCharacters: 160,
          maxEmojis: 1,
          tone: bucketConfig.tone,
          aggressionLevel: bucketConfig.aggression,
          statusContext: [status],
          sendWindowStart: '08:00',
          sendWindowEnd: '19:00',
          timezone: 'America/Chicago'
        }
      ],
      statusRules: [STATUS_RULES[status]],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return processTemplate;
  }

  // Get delay hours based on aggression level and sequence
  private getDelayByAggression(aggression: number, sequenceNumber: number): number {
    const baseDelays = {
      1: [24, 72, 168], // Gentle: 1 day, 3 days, 1 week
      2: [12, 48, 120], // Mild: 12 hours, 2 days, 5 days
      3: [8, 24, 72],   // Medium: 8 hours, 1 day, 3 days
      4: [4, 12, 24],   // High: 4 hours, 12 hours, 1 day
      5: [2, 6, 12]     // Very High: 2 hours, 6 hours, 12 hours
    };
    
    const delays = baseDelays[aggression] || baseDelays[3];
    return delays[sequenceNumber - 1] || delays[delays.length - 1];
  }

  // Initialize all enhanced processes
  async initializeEnhancedProcesses(): Promise<EnhancedProcessTemplate[]> {
    const processes: EnhancedProcessTemplate[] = [];
    
    // Create processes for key combinations
    const keySourceBuckets: SourceBucket[] = ['marketplace', 'phone_up', 'website_forms', 'referral_repeat'];
    const keyLeadTypes: LeadTypeId[] = ['retail_1', 'finance_2', 'trade_in_5'];
    const keyStatuses: LeadStatusNormalized[] = ['new', 'working', 'appt_set'];
    
    for (const bucket of keySourceBuckets) {
      for (const type of keyLeadTypes) {
        for (const status of keyStatuses) {
          const process = await this.createEnhancedProcess(bucket, type, status);
          processes.push(process);
        }
      }
    }
    
    console.log(`Generated ${processes.length} enhanced process templates`);
    return processes;
  }
}

export const enhancedProcessService = new EnhancedProcessService();
