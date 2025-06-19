
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

export const useConversationRealtime = (selectedLeadId: string | null, loadMessages: (leadId: string) => Promise<void>) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const realtimeChannelRef = useRef<any>(null);

  // Set up consolidated realtime subscription
  useEffect(() => {
    if (!profile) return;

    // Clean up existing channel
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
    }

    console.log('🔄 [STABLE CONV] Setting up realtime subscription');

    const channel = supabase
      .channel('stable-conversation-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        (payload) => {
          console.log('📨 [STABLE CONV] Realtime update:', payload.eventType);
          
          // Debounced refresh to prevent excessive updates
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['stable-conversations'] });
            
            // If viewing messages for the affected lead, reload them
            if (selectedLeadId && payload.new && typeof payload.new === 'object' && 'lead_id' in payload.new) {
              const newRecord = payload.new as { lead_id: string };
              if (newRecord.lead_id === selectedLeadId) {
                loadMessages(selectedLeadId);
              }
            }
          }, 1000);
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [profile, queryClient, selectedLeadId, loadMessages]);
};
