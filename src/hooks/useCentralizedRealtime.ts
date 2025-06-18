
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import type { RealtimeCallbacks } from '@/types/realtime';

export const useCentralizedRealtime = (callbacks: RealtimeCallbacks = {}) => {
  const { profile } = useAuth();
  const channelRef = useRef<any>(null);
  const callbacksRef = useRef(callbacks);
  
  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    if (!profile) return;

    console.log('🔗 Setting up centralized realtime subscriptions');

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

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
          
          // Call conversation update callback
          if (callbacksRef.current.onConversationUpdate) {
            callbacksRef.current.onConversationUpdate();
          }
          
          // Call message update callback with lead ID
          if (callbacksRef.current.onMessageUpdate && payload.new.lead_id) {
            callbacksRef.current.onMessageUpdate(payload.new.lead_id);
          }
          
          // Call unread count update
          if (callbacksRef.current.onUnreadCountUpdate) {
            callbacksRef.current.onUnreadCountUpdate();
          }
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
          
          // Call conversation update callback
          if (callbacksRef.current.onConversationUpdate) {
            callbacksRef.current.onConversationUpdate();
          }
          
          // Call message update callback with lead ID
          if (callbacksRef.current.onMessageUpdate && payload.new.lead_id) {
            callbacksRef.current.onMessageUpdate(payload.new.lead_id);
          }
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
          
          // Call conversation update callback for lead changes
          if (callbacksRef.current.onConversationUpdate) {
            callbacksRef.current.onConversationUpdate();
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Centralized realtime status:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('🔌 Cleaning up centralized realtime subscriptions');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [profile]);

  return null;
};
