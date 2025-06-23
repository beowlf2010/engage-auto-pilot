
export interface ConversationData {
  leadId: string;
  leadName: string;
  leadPhone: string;
  vehicleInterest: string;
  unreadCount: number;
  lastMessage: string;
  lastMessageTime: string;
  lastMessageDirection?: 'in' | 'out';
  status: string;
  salespersonId: string;
  salespersonName?: string;
  aiOptIn?: boolean;
  lastMessageDate?: Date;
  leadSource?: string;
}

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
  hasUnrepliedInbound?: boolean; // NEW: Added this property
}

export interface MessageData {
  id: string;
  leadId: string;
  direction: 'in' | 'out';
  body: string;
  sentAt: string;
  readAt?: string;
  aiGenerated: boolean;
  smsStatus: string;
  smsError?: string;
  leadSource?: string;
  leadName?: string;
  vehicleInterest?: string;
}
