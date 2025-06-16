
import { useMemo } from 'react';
import type { ConversationData } from '@/types/conversation';

export const useUnreadCount = (conversations: ConversationData[]) => {
  return useMemo(() => {
    if (!conversations || !Array.isArray(conversations)) {
      return 0;
    }
    
    return conversations.reduce((count, conversation) => {
      return count + (conversation.unreadCount || 0);
    }, 0);
  }, [conversations]);
};
