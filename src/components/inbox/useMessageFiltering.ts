
import { useState, useMemo } from 'react';
import { ConversationListItem, MessageData } from '@/types/conversation';

type FilterType = 'all' | 'inbound' | 'sent' | 'unread';

export const useMessageFiltering = () => {
  const [conversationFilter, setConversationFilter] = useState<FilterType>('all');
  const [messageFilter, setMessageFilter] = useState<FilterType>('all');

  const filterConversations = (conversations: ConversationListItem[], filter: FilterType): ConversationListItem[] => {
    if (filter === 'all') return conversations;
    
    return conversations.filter(conv => {
      if (filter === 'inbound') return conv.lastMessageDirection === 'in';
      if (filter === 'sent') return conv.lastMessageDirection === 'out';
      if (filter === 'unread') return conv.unreadCount > 0;
      return true;
    });
  };

  const filterMessages = (messages: MessageData[], filter: FilterType): MessageData[] => {
    if (filter === 'all') return messages;
    
    return messages.filter(msg => {
      if (filter === 'inbound') return msg.direction === 'in';
      if (filter === 'sent') return msg.direction === 'out';
      if (filter === 'unread') return !msg.readAt;
      return true;
    });
  };

  // Universal sorting function that always prioritizes unread conversations
  const sortConversationsWithUnreadFirst = (conversations: ConversationListItem[]): ConversationListItem[] => {
    return [...conversations].sort((a, b) => {
      // First priority: Unread conversations always come first
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      
      // If both have unread messages, sort by unread count (most unread first)
      if (a.unreadCount > 0 && b.unreadCount > 0) {
        if (a.unreadCount !== b.unreadCount) {
          return b.unreadCount - a.unreadCount;
        }
      }
      
      // Final tiebreaker: Sort by last message time (newest first)
      return (b.lastMessageDate?.getTime() || 0) - (a.lastMessageDate?.getTime() || 0);
    });
  };

  const getFilteredConversations = useMemo(() => {
    return (conversations: ConversationListItem[]) => {
      const filtered = filterConversations(conversations, conversationFilter);
      
      // Always apply unread-first sorting regardless of filter type
      return sortConversationsWithUnreadFirst(filtered);
    };
  }, [conversationFilter]);

  const getFilteredMessages = useMemo(() => {
    return (messages: MessageData[]) => {
      return filterMessages(messages, messageFilter);
    };
  }, [messageFilter]);

  const getConversationCounts = (conversations: ConversationListItem[]) => {
    const inboundCount = conversations.filter(conv => conv.lastMessageDirection === 'in').length;
    const sentCount = conversations.filter(conv => conv.lastMessageDirection === 'out').length;
    const unreadCount = conversations.filter(conv => conv.unreadCount > 0).length;
    const totalCount = conversations.length;
    
    return { inboundCount, sentCount, unreadCount, totalCount };
  };

  const getMessageCounts = (messages: MessageData[]) => {
    const inboundCount = messages.filter(msg => msg.direction === 'in').length;
    const sentCount = messages.filter(msg => msg.direction === 'out').length;
    const unreadCount = messages.filter(msg => !msg.readAt).length;
    const totalCount = messages.length;
    
    return { inboundCount, sentCount, unreadCount, totalCount };
  };

  return {
    conversationFilter,
    messageFilter,
    setConversationFilter,
    setMessageFilter,
    getFilteredConversations,
    getFilteredMessages,
    getConversationCounts,
    getMessageCounts
  };
};
