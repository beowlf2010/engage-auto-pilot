
import { useMemo } from 'react';
import type { ConversationData } from '@/types/conversation';

export const useUnreadCount = (conversations: ConversationData[]) => {
  return useMemo(() => {
    return conversations.reduce((count, conversation) => {
      return count + conversation.unreadCount;
    }, 0);
  }, [conversations]);
};
