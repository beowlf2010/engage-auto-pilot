
export interface PhoneNumber {
  id: string;
  number: string;
  type: 'cell' | 'day' | 'eve';
  priority: number;
  status: 'active' | 'failed' | 'opted_out';
  isPrimary: boolean;
  lastAttempt?: string;
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
  status: 'new' | 'engaged' | 'paused' | 'closed' | 'lost';
  salesperson: string;
  salespersonId: string;
  aiOptIn: boolean;
  aiStage?: string;
  nextAiSendAt?: string;
  createdAt: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  doNotCall: boolean;
  doNotEmail: boolean;
  doNotMail: boolean;
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleVIN?: string;
  contactStatus: 'no_contact' | 'contact_attempted' | 'response_received';
  // Message count properties calculated in useLeads hook
  incomingCount: number;
  outgoingCount: number;
  messageCount?: number;
  // New enhanced AI tracking fields
  aiMessagesSent?: number;
  aiLastMessageStage?: string;
  aiSequencePaused?: boolean;
  aiPauseReason?: string;
  aiResumeAt?: string;
  // Additional required Lead properties
  first_name: string;
  last_name: string;
  created_at: string;
}
