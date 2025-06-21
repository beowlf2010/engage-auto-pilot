
export interface ConversationData {
  leadId: string;
  leadName: string;
  leadPhone: string;
  vehicleInterest: string;
  unreadCount: number;
  lastMessage: string;
  lastMessageTime: string;
  status: string;
  salespersonId: string;
  salespersonName?: string;
  aiOptIn?: boolean;
  lastMessageDate?: Date;
}

export interface MessageData {
  id: string;
  leadId: string;
  direction: 'in' | 'out';
  body: string;
  sentAt: string;
  readAt?: string; // Add the missing readAt property
  aiGenerated?: boolean;
  smsStatus?: string;
  smsError?: string;
}
