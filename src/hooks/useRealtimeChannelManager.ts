
import { useCallback, useEffect } from 'react';
import { stableRealtimeManager } from '@/services/stableRealtimeManager';
import type { RealtimeCallbacks } from '@/types/realtime';

// Global state to prevent multiple subscriptions
let globalChannelState = {
  callbacks: [] as RealtimeCallbacks[],
  subscriptions: new Map<string, () => void>(),
  isSubscribing: false
};

export const useRealtimeChannelManager = () => {
  const addCallbacks = useCallback((callbacks: RealtimeCallbacks) => {
    // Check if callbacks already exist to prevent duplicates
    const exists = globalChannelState.callbacks.find(cb => cb === callbacks);
    if (!exists) {
      globalChannelState.callbacks.push(callbacks);
      console.log('✅ Added callbacks, total subscribers:', globalChannelState.callbacks.length);
    }
  }, []);

  const removeCallbacks = useCallback((callbacks: RealtimeCallbacks) => {
    const index = globalChannelState.callbacks.findIndex(cb => cb === callbacks);
    if (index > -1) {
      globalChannelState.callbacks.splice(index, 1);
      console.log('🗑️ Removed callbacks, remaining subscribers:', globalChannelState.callbacks.length);
    }
  }, []);

  const createChannel = useCallback((profile: any, handleIncomingMessage: any, handleIncomingEmail: any) => {
    if (globalChannelState.isSubscribing) {
      console.log('🔌 Channel creation already in progress');
      return;
    }

    if (globalChannelState.subscriptions.size > 0) {
      console.log('🔌 Reusing existing stable channel subscriptions');
      return;
    }

    globalChannelState.isSubscribing = true;
    console.log('🔌 Creating stable realtime subscriptions');

    // Subscribe to conversations using the stable manager
    const conversationUnsubscribe = stableRealtimeManager.subscribe({
      id: 'conversations-updates',
      callback: (payload) => {
        console.log('🔄 Conversation database change:', {
          event: payload.eventType,
          table: payload.table,
          hasNew: !!payload.new,
          hasOld: !!payload.old
        });
        handleIncomingMessage(payload);
      },
      filters: {
        event: '*',
        schema: 'public',
        table: 'conversations'
      }
    });

    globalChannelState.subscriptions.set('conversations', conversationUnsubscribe);
    globalChannelState.isSubscribing = false;
    
    console.log('✅ Stable realtime subscriptions created');
  }, []);

  const cleanupChannel = useCallback(() => {
    if (globalChannelState.callbacks.length === 0 && globalChannelState.subscriptions.size > 0) {
      console.log('🧹 Cleaning up stable realtime subscriptions');
      
      // Unsubscribe from all subscriptions
      globalChannelState.subscriptions.forEach((unsubscribe, key) => {
        console.log(`🗑️ Unsubscribing from ${key}`);
        unsubscribe();
      });
      
      globalChannelState.subscriptions.clear();
      globalChannelState.isSubscribing = false;
    }
  }, []);

  // Initialize stable realtime manager on mount
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      stableRealtimeManager.cleanup();
    };
  }, []);

  return {
    addCallbacks,
    removeCallbacks,
    createChannel,
    cleanupChannel,
    getCallbacks: () => globalChannelState.callbacks,
    isSubscribing: () => globalChannelState.isSubscribing,
    isSubscribed: () => globalChannelState.subscriptions.size > 0
  };
};
