
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import type { RealtimeCallbacks } from '@/types/realtime';

// Global state to prevent multiple subscriptions
let globalChannel: any = null;
let globalCallbacks: RealtimeCallbacks[] = [];
let isSubscribing = false;

export const useCentralizedRealtime = (callbacks: RealtimeCallbacks = {}) => {
  const { profile } = useAuth();
  const callbacksRef = useRef(callbacks);
  
  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    if (!profile) return;

    console.log('🔗 Adding callbacks to centralized realtime');
    
    // Add callbacks to global list
    globalCallbacks.push(callbacksRef.current);
    
    // Only create channel if it doesn't exist and we're not already subscribing
    if (!globalChannel && !isSubscribing) {
      console.log('🔗 Setting up centralized realtime subscriptions');
      isSubscribing = true;

      // Set up unified channel for all realtime updates
      const channel = supabase
        .channel('unified-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'conversations'
          },
          (payload) => {
            console.log('📨 New conversation via realtime:', payload);
            
            // Call all registered callbacks
            globalCallbacks.forEach(cb => {
              if (cb.onConversationUpdate) {
                cb.onConversationUpdate();
              }
              
              if (cb.onMessageUpdate && payload.new.lead_id) {
                cb.onMessageUpdate(payload.new.lead_id);
              }
              
              if (cb.onUnreadCountUpdate) {
                cb.onUnreadCountUpdate();
              }
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'conversations'
          },
          (payload) => {
            console.log('📝 Updated conversation via realtime:', payload);
            
            // Call all registered callbacks
            globalCallbacks.forEach(cb => {
              if (cb.onConversationUpdate) {
                cb.onConversationUpdate();
              }
              
              if (cb.onMessageUpdate && payload.new.lead_id) {
                cb.onMessageUpdate(payload.new.lead_id);
              }
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'leads'
          },
          (payload) => {
            console.log('👤 Lead updated via realtime:', payload);
            
            // Call all registered callbacks
            globalCallbacks.forEach(cb => {
              if (cb.onConversationUpdate) {
                cb.onConversationUpdate();
              }
            });
          }
        )
        .subscribe((status) => {
          console.log('📡 Centralized realtime status:', status);
          if (status === 'SUBSCRIBED') {
            globalChannel = channel;
            isSubscribing = false;
          } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            globalChannel = null;
            isSubscribing = false;
          }
        });
    }

    return () => {
      console.log('🔌 Removing callbacks from centralized realtime');
      
      // Remove callbacks from global list
      const index = globalCallbacks.findIndex(cb => cb === callbacksRef.current);
      if (index > -1) {
        globalCallbacks.splice(index, 1);
      }
      
      // Clean up channel if no more callbacks
      if (globalCallbacks.length === 0 && globalChannel) {
        console.log('🔌 Cleaning up centralized realtime subscriptions');
        supabase.removeChannel(globalChannel);
        globalChannel = null;
        isSubscribing = false;
      }
    };
  }, [profile]);

  return null;
};
