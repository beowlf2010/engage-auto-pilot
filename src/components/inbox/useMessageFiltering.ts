
import { useState, useMemo } from 'react';
import { ConversationListItem, MessageData } from '@/types/conversation';

type FilterType = 'all' | 'inbound' | 'sent';

export const useMessageFiltering = () => {
  const [conversationFilter, setConversationFilter] = useState<FilterType>('all');
  const [messageFilter, setMessageFilter] = useState<FilterType>('all');

  const filterConversations = (conversations: ConversationListItem[], filter: FilterType): ConversationListItem[] => {
    if (filter === 'all') return conversations;
    
    return conversations.filter(conv => {
      if (filter === 'inbound') return conv.lastMessageDirection === 'in';
      if (filter === 'sent') return conv.lastMessageDirection === 'out';
      return true;
    });
  };

  const filterMessages = (messages: MessageData[], filter: FilterType): MessageData[] => {
    if (filter === 'all') return messages;
    
    return messages.filter(msg => {
      if (filter === 'inbound') return msg.direction === 'in';
      if (filter === 'sent') return msg.direction === 'out';
      return true;
    });
  };

  const getFilteredConversations = useMemo(() => {
    return (conversations: ConversationListItem[]) => {
      return filterConversations(conversations, conversationFilter);
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
    const totalCount = conversations.length;
    
    return { inboundCount, sentCount, totalCount };
  };

  const getMessageCounts = (messages: MessageData[]) => {
    const inboundCount = messages.filter(msg => msg.direction === 'in').length;
    const sentCount = messages.filter(msg => msg.direction === 'out').length;
    const totalCount = messages.length;
    
    return { inboundCount, sentCount, totalCount };
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
