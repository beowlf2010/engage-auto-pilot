
import { ConversationData } from './types';

export interface ConversationStats {
  latestConversation: ConversationData | null;
  messageCount: number;
  outgoingCount: number;
  incomingCount: number;
  unreadCount: number;
  lastMessageDirection: 'in' | 'out' | null;
  unrepliedCount: number;
}

export const processConversations = (
  conversationsData: ConversationData[] | null,
  leadId: string
): ConversationStats => {
  if (!conversationsData) {
    return {
      latestConversation: null,
      messageCount: 0,
      outgoingCount: 0,
      incomingCount: 0,
      unreadCount: 0,
      lastMessageDirection: null,
      unrepliedCount: 0
    };
  }

  const leadConversations = conversationsData.filter(conv => conv.lead_id === leadId);
  
  if (leadConversations.length === 0) {
    return {
      latestConversation: null,
      messageCount: 0,
      outgoingCount: 0,
      incomingCount: 0,
      unreadCount: 0,
      lastMessageDirection: null,
      unrepliedCount: 0
    };
  }

  // Sort conversations by sent_at (newest first for latest, oldest first for processing)
  const sortedConversations = [...leadConversations].sort(
    (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
  );

  const latestConversation = sortedConversations[0];
  const messageCount = leadConversations.length;
  const outgoingCount = leadConversations.filter(c => c.direction === 'out').length;
  const incomingCount = leadConversations.filter(c => c.direction === 'in').length;
  const unreadCount = leadConversations.filter(c => c.direction === 'in' && !c.read_at).length;
  const lastMessageDirection = latestConversation?.direction || null;

  // Calculate unreplied count
  const chronologicalConversations = [...leadConversations].sort(
    (a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
  );

  const lastIncomingMessage = [...chronologicalConversations]
    .reverse()
    .find(c => c.direction === 'in');

  let unrepliedCount = 0;
  if (!lastIncomingMessage) {
    // No incoming messages, so all outgoing messages are unreplied
    unrepliedCount = outgoingCount;
  } else {
    // Count outgoing messages sent after the last incoming message
    const lastIncomingTime = new Date(lastIncomingMessage.sent_at).getTime();
    unrepliedCount = chronologicalConversations.filter(c => 
      c.direction === 'out' && new Date(c.sent_at).getTime() > lastIncomingTime
    ).length;
  }

  return {
    latestConversation,
    messageCount,
    outgoingCount,
    incomingCount,
    unreadCount,
    lastMessageDirection,
    unrepliedCount
  };
};

export const determineContactStatus = (
  outgoingCount: number,
  incomingCount: number
): 'no_contact' | 'contact_attempted' | 'response_received' => {
  if (incomingCount > 0) {
    return 'response_received';
  } else if (outgoingCount > 0) {
    return 'contact_attempted';
  }
  return 'no_contact';
};
