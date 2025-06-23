
import { useState, useCallback, useRef } from 'react';
import { ConversationListItem } from '@/types/conversation';

interface OptimisticUnreadState {
  [leadId: string]: number;
}

export const useOptimisticUnreadCounts = () => {
  const [optimisticUnreadCounts, setOptimisticUnreadCounts] = useState<OptimisticUnreadState>({});
  const markingAsReadRef = useRef<Set<string>>(new Set());

  const updateOptimisticUnreadCount = useCallback((leadId: string, newCount: number) => {
    setOptimisticUnreadCounts(prev => ({
      ...prev,
      [leadId]: Math.max(0, newCount)
    }));
  }, []);

  const markAsReadOptimistically = useCallback((leadId: string) => {
    // Prevent duplicate marking
    if (markingAsReadRef.current.has(leadId)) {
      return false;
    }

    markingAsReadRef.current.add(leadId);
    
    // Optimistically set unread count to 0
    updateOptimisticUnreadCount(leadId, 0);

    // Remove from marking set after a delay
    setTimeout(() => {
      markingAsReadRef.current.delete(leadId);
    }, 1000);

    return true;
  }, [updateOptimisticUnreadCount]);

  const getEffectiveUnreadCount = useCallback((conversation: ConversationListItem): number => {
    const optimisticCount = optimisticUnreadCounts[conversation.leadId];
    return optimisticCount !== undefined ? optimisticCount : conversation.unreadCount;
  }, [optimisticUnreadCounts]);

  const clearOptimisticCount = useCallback((leadId: string) => {
    setOptimisticUnreadCounts(prev => {
      const updated = { ...prev };
      delete updated[leadId];
      return updated;
    });
  }, []);

  const isMarking = useCallback((leadId: string) => {
    return markingAsReadRef.current.has(leadId);
  }, []);

  return {
    updateOptimisticUnreadCount,
    markAsReadOptimistically,
    getEffectiveUnreadCount,
    clearOptimisticCount,
    isMarking
  };
};
