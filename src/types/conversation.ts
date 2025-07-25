
export interface ConversationData {
  leadId: string;
  leadName: string;
  leadPhone: string;
  leadEmail?: string;
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
  messageCount?: number;
  leadType?: string;
}

export interface ConversationListItem {
  leadId: string;
  leadName: string;
  primaryPhone: string;
  leadPhone: string;
  leadEmail: string;
  lastMessage: string;
  lastMessageTime: string;
  lastMessageDirection: 'in' | 'out' | null;
  unreadCount: number;
  messageCount: number;
  salespersonId: string | null;
  vehicleInterest: string;
  leadSource: string;
  leadType: string;
  status: string;
  lastMessageDate: Date;
  salespersonName?: string;
  aiOptIn?: boolean;
  aiStage?: string;
  aiMessagesSent?: number;
  aiSequencePaused?: boolean;
  messageIntensity?: string;
  incomingCount?: number;
  outgoingCount?: number;
  hasUnrepliedInbound?: boolean;
  isAiGenerated?: boolean;
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
