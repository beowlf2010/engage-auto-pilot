
export interface PhoneNumber {
  id: string;
  number: string;
  type: 'cell' | 'day' | 'eve';
  priority: number;
  status: 'active' | 'failed' | 'opted_out' | 'needs_review';
  isPrimary: boolean;
  lastAttempt?: string; // Add optional lastAttempt property
}

export interface Lead {
  id: string; // Changed from number to string to match UUID
  firstName: string;
  lastName: string;
  middleName?: string;
  phoneNumbers: PhoneNumber[];
  primaryPhone: string; // The currently active phone number
  email: string;
  emailAlt?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  vehicleInterest: string;
  source: string;
  status: 'new' | 'engaged' | 'active' | 'paused' | 'closed' | 'lost';
  salesperson: string;
  salespersonId: string;
  aiOptIn: boolean;
  aiContactEnabled?: boolean; // New field for proactive contact AI
  aiRepliesEnabled?: boolean; // New field for auto-reply AI
  aiStage?: string;
  nextAiSendAt?: string;
  createdAt: string;
  lastMessage?: string;
  lastMessageTime?: string;
  lastMessageDirection?: 'in' | 'out' | null; // New field for message direction
  unreadCount: number;
  doNotCall: boolean;
  doNotEmail: boolean;
  doNotMail: boolean;
  vehicleYear?: number; // Changed to number to match LeadDetailData
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleVIN?: string;
  contactStatus: 'no_contact' | 'contact_attempted' | 'response_received';
  // Message count properties calculated in useLeads hook
  incomingCount: number;
  outgoingCount: number;
  unrepliedCount: number; // New field for accurate unreplied count
  messageCount?: number;
  // New enhanced AI tracking fields
  aiMessagesSent?: number;
  aiLastMessageStage?: string;
  aiSequencePaused?: boolean;
  aiPauseReason?: string;
  aiResumeAt?: string;
  // New unified AI strategy fields
  leadStatusTypeName?: string;
  leadTypeName?: string;
  leadSourceName?: string;
  messageIntensity?: 'gentle' | 'standard' | 'aggressive';
  aiStrategyBucket?: string;
  aiAggressionLevel?: number;
  aiStrategyLastUpdated?: string;
  // Additional required Lead properties
  first_name: string;
  last_name: string;
  created_at: string;
  // Hidden functionality
  is_hidden?: boolean;
}
