
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeCallbacks } from '@/types/realtime';

// Global state to prevent multiple subscriptions
let globalChannelState = {
  channel: null as any,
  callbacks: [] as RealtimeCallbacks[],
  isSubscribing: false,
  isSubscribed: false
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
    if (globalChannelState.channel && globalChannelState.isSubscribed) {
      console.log('🔌 Channel already exists and is subscribed');
      return globalChannelState.channel;
    }

    if (globalChannelState.isSubscribing) {
      console.log('🔌 Channel is already being created');
      return globalChannelState.channel;
    }

    globalChannelState.isSubscribing = true;
    
    const channelName = `centralized-realtime-${profile.id}`;
    console.log('🔌 Creating centralized realtime channel:', channelName);
    
    // Clean up any existing channel first
    if (globalChannelState.channel) {
      supabase.removeChannel(globalChannelState.channel);
    }
    
    const channel = supabase
      .channel(channelName)
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
        globalChannelState.isSubscribed = true;
        console.log('✅ Centralized realtime channel subscribed successfully');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Centralized realtime channel error');
        globalChannelState.channel = null;
        globalChannelState.isSubscribing = false;
        globalChannelState.isSubscribed = false;
      } else if (status === 'CLOSED') {
        console.log('🔌 Centralized realtime channel closed');
        globalChannelState.channel = null;
        globalChannelState.isSubscribing = false;
        globalChannelState.isSubscribed = false;
      }
    });

    globalChannelState.channel = channel;
    return channel;
  }, []);

  const cleanupChannel = useCallback(() => {
    if (globalChannelState.callbacks.length === 0 && globalChannelState.channel) {
      try {
        console.log('🧹 Cleaning up centralized realtime channel');
        supabase.removeChannel(globalChannelState.channel);
        globalChannelState.channel = null;
        globalChannelState.isSubscribing = false;
        globalChannelState.isSubscribed = false;
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
    isSubscribing: () => globalChannelState.isSubscribing,
    isSubscribed: () => globalChannelState.isSubscribed
  };
};
