
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeCallbacks } from '@/types/realtime';

// Global state to prevent multiple subscriptions
let globalChannelState = {
  channel: null as any,
  callbacks: [] as RealtimeCallbacks[],
  isSubscribing: false,
  isSubscribed: false,
  subscriptionPromise: null as Promise<any> | null
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
    // If we already have a subscribed channel, return it
    if (globalChannelState.channel && globalChannelState.isSubscribed) {
      console.log('🔌 Reusing existing subscribed channel');
      return globalChannelState.channel;
    }

    // If we're already in the process of subscribing, return the existing channel
    if (globalChannelState.isSubscribing && globalChannelState.channel) {
      console.log('🔌 Channel subscription in progress, reusing channel');
      return globalChannelState.channel;
    }

    // If there's a subscription promise, wait for it
    if (globalChannelState.subscriptionPromise) {
      console.log('🔌 Waiting for existing subscription promise');
      return globalChannelState.subscriptionPromise.then(() => globalChannelState.channel);
    }

    globalChannelState.isSubscribing = true;
    
    const channelName = `centralized-realtime-${profile.id}`;
    console.log('🔌 Creating new centralized realtime channel:', channelName);
    
    // Clean up any existing channel first
    if (globalChannelState.channel) {
      try {
        supabase.removeChannel(globalChannelState.channel);
      } catch (error) {
        console.log('🧹 Error cleaning up old channel (expected):', error);
      }
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

    globalChannelState.channel = channel;

    // Create subscription promise to prevent race conditions
    globalChannelState.subscriptionPromise = new Promise((resolve, reject) => {
      channel.subscribe((status) => {
        console.log('📡 Centralized realtime channel status:', status);
        
        if (status === 'SUBSCRIBED') {
          globalChannelState.isSubscribing = false;
          globalChannelState.isSubscribed = true;
          globalChannelState.subscriptionPromise = null;
          console.log('✅ Centralized realtime channel subscribed successfully');
          resolve(channel);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Centralized realtime channel error');
          globalChannelState.channel = null;
          globalChannelState.isSubscribing = false;
          globalChannelState.isSubscribed = false;
          globalChannelState.subscriptionPromise = null;
          reject(new Error('Channel subscription failed'));
        } else if (status === 'CLOSED') {
          console.log('🔌 Centralized realtime channel closed');
          globalChannelState.channel = null;
          globalChannelState.isSubscribing = false;
          globalChannelState.isSubscribed = false;
          globalChannelState.subscriptionPromise = null;
          resolve(null);
        }
      });
    });

    return globalChannelState.subscriptionPromise.then(() => globalChannelState.channel);
  }, []);

  const cleanupChannel = useCallback(() => {
    if (globalChannelState.callbacks.length === 0 && globalChannelState.channel) {
      try {
        console.log('🧹 Cleaning up centralized realtime channel');
        supabase.removeChannel(globalChannelState.channel);
        globalChannelState.channel = null;
        globalChannelState.isSubscribing = false;
        globalChannelState.isSubscribed = false;
        globalChannelState.subscriptionPromise = null;
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
