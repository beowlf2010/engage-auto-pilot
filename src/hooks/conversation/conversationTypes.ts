
export interface ConversationListItem {
  leadId: string;
  leadName: string;
  primaryPhone: string;
  leadPhone: string;
  lastMessage: string;
  lastMessageTime: string;
  lastMessageDirection: 'in' | 'out' | null;
  unreadCount: number;
  messageCount: number;
  salespersonId: string | null;
  vehicleInterest: string;
  status: string;
  lastMessageDate: Date;
  salespersonName?: string;
  aiOptIn?: boolean;
  leadSource?: string;
  aiStage?: string;
  aiMessagesSent?: number;
  aiSequencePaused?: boolean;
  messageIntensity?: string;
  incomingCount?: number;
  outgoingCount?: number;
}

export interface MessageData {
  id: string;
  leadId: string;
  body: string;
  direction: 'in' | 'out';
  sentAt: string;
  smsStatus: string;
  aiGenerated: boolean;
  readAt?: string;
  smsError?: string;
  leadSource?: string;
  leadName?: string;
  vehicleInterest?: string;
}
