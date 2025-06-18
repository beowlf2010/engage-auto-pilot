
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannelState } from '@/types/realtime';

// Global state to prevent multiple subscriptions
let globalChannelState: RealtimeChannelState = {
  channel: null,
  callbacks: [],
  isSubscribing: false
};

export const useRealtimeChannelManager = () => {
  const addCallbacks = useCallback((callbacks: any) => {
    globalChannelState.callbacks.push(callbacks);
    console.log('✅ Added callbacks, total subscribers:', globalChannelState.callbacks.length);
  }, []);

  const removeCallbacks = useCallback((callbacks: any) => {
    const index = globalChannelState.callbacks.findIndex(cb => cb === callbacks);
    if (index > -1) {
      globalChannelState.callbacks.splice(index, 1);
      console.log('🗑️ Removed callbacks, remaining subscribers:', globalChannelState.callbacks.length);
    }
  }, []);

  const createChannel = useCallback((profile: any, handleIncomingMessage: any, handleIncomingEmail: any) => {
    if (globalChannelState.channel || globalChannelState.isSubscribing) {
      console.log('🔌 Channel already exists or is being created');
      return globalChannelState.channel;
    }

    globalChannelState.isSubscribing = true;
    
    const channelName = `centralized-realtime-${profile.id}-${Date.now()}`;
    console.log('🔌 Creating centralized realtime channel:', channelName);
    
    const channel = supabase
      .channel(channelName)
      // SMS conversations - listen to all conversation changes
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations'
      }, (payload) => {
        console.log('🔄 Conversation database change:', {
          event: payload.eventType,
          table: payload.table,
          hasNew: !!payload.new,
          hasOld: !!payload.old
        });
        handleIncomingMessage(payload);
      })
      // Email conversations
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'email_conversations',
        filter: 'direction=eq.in'
      }, handleIncomingEmail);

    channel.subscribe((status) => {
      console.log('📡 Centralized realtime channel status:', status);
      if (status === 'SUBSCRIBED') {
        globalChannelState.channel = channel;
        globalChannelState.isSubscribing = false;
        console.log('✅ Centralized realtime channel subscribed successfully');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Centralized realtime channel error');
        globalChannelState.channel = null;
        globalChannelState.isSubscribing = false;
      } else if (status === 'CLOSED') {
        console.log('🔌 Centralized realtime channel closed');
        globalChannelState.channel = null;
        globalChannelState.isSubscribing = false;
      }
    });

    return channel;
  }, []);

  const cleanupChannel = useCallback(() => {
    if (globalChannelState.callbacks.length === 0 && globalChannelState.channel) {
      try {
        console.log('🧹 Cleaning up centralized realtime channel');
        supabase.removeChannel(globalChannelState.channel);
        globalChannelState.channel = null;
        globalChannelState.isSubscribing = false;
      } catch (error) {
        console.error('❌ Error removing centralized realtime channel:', error);
      }
    }
  }, []);

  return {
    addCallbacks,
    removeCallbacks,
    createChannel,
    cleanupChannel,
    getCallbacks: () => globalChannelState.callbacks,
    getChannel: () => globalChannelState.channel,
    isSubscribing: () => globalChannelState.isSubscribing
  };
};
