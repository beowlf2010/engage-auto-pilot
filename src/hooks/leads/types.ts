

export interface ConversationData {
  lead_id: string;
  body: string;
  sent_at: string;
  direction: 'in' | 'out';
  read_at: string | null;
  sms_status: string;
}

export interface LeadData {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  email: string;
  email_alt?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  vehicle_interest: string;
  vehicle_year?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_vin?: string;
  source: string;
  status: string;
  salesperson_id: string;
  ai_opt_in: boolean;
  ai_contact_enabled?: boolean;
  ai_replies_enabled?: boolean;
  ai_stage?: string;
  next_ai_send_at?: string;
  created_at: string;
  do_not_call: boolean;
  do_not_email: boolean;
  do_not_mail: boolean;
  ai_messages_sent?: number;
  ai_last_message_stage?: string;
  ai_sequence_paused?: boolean;
  ai_pause_reason?: string;
  ai_resume_at?: string;
  phone_numbers: Array<{
    id: string;
    number: string;
    type: string;
    priority: number;
    status: string;
    is_primary: boolean;
    last_attempt?: string;
  }>;
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

// Import PhoneNumber from the main Lead type to ensure compatibility
import { PhoneNumber } from '@/types/lead';

export interface ProcessedLead {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  phoneNumbers: PhoneNumber[]; // Use the same PhoneNumber type as Lead
  primaryPhone: string;
  email: string;
  emailAlt?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  vehicleInterest: string;
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleVIN?: string;
  source: string;
  status: 'new' | 'engaged' | 'paused' | 'closed' | 'lost'; // Use the same status type as Lead
  salesperson: string;
  salespersonId: string;
  aiOptIn: boolean;
  aiContactEnabled?: boolean;
  aiRepliesEnabled?: boolean;
  aiStage?: string;
  nextAiSendAt?: string;
  createdAt: string;
  lastMessage?: string;
  lastMessageTime?: string;
  lastMessageDirection?: 'in' | 'out' | null;
  unreadCount: number;
  messageCount: number;
  outgoingCount: number;
  incomingCount: number;
  unrepliedCount: number;
  contactStatus: 'no_contact' | 'contact_attempted' | 'response_received';
  hasBeenMessaged: boolean;
  doNotCall: boolean;
  doNotEmail: boolean;
  doNotMail: boolean;
  aiMessagesSent?: number;
  aiLastMessageStage?: string;
  aiSequencePaused?: boolean;
  aiPauseReason?: string;
  aiResumeAt?: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

