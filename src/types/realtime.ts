
export interface RealtimeCallbacks {
  onConversationUpdate?: () => void;
  onMessageUpdate?: (leadId: string) => void;
  onEmailNotification?: (payload: any) => void;
  onUnreadCountUpdate?: () => void;
}

export interface RealtimeChannelState {
  channel: any | null;
  callbacks: RealtimeCallbacks[];
  isSubscribing: boolean;
}
