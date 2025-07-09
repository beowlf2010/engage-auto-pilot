import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MessageData } from '@/types/conversation';
import { useErrorHandler } from '@/hooks/useErrorHandler';

export const useConversationData = () => {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const currentLeadIdRef = useRef<string | null>(null);
  const realtimeChannelRef = useRef<any>(null);
  const { safeExecute, handleError } = useErrorHandler();

  const loadMessages = useCallback(async (leadId: string) => {
    if (!leadId) return;
    
    setMessagesLoading(true);
    setMessagesError(null);
    currentLeadIdRef.current = leadId;
    
    const result = await safeExecute(
      async () => {
        const { data, error } = await supabase
          .from('conversations')
          .select('*')
          .eq('lead_id', leadId)
          .order('sent_at', { ascending: true });

        if (error) {
          throw error;
        }

        if (!data) {
          return [];
        }

        const transformedMessages: MessageData[] = data.map(msg => ({
          id: msg.id,
          leadId: msg.lead_id,
          body: msg.body,
          direction: msg.direction as 'in' | 'out',
          sentAt: msg.sent_at,
          smsStatus: msg.sms_status || 'delivered',
          aiGenerated: msg.ai_generated || false
        }));

        // Mark incoming messages as read
        const unreadIncoming = data.filter(msg => msg.direction === 'in' && !msg.read_at);
        if (unreadIncoming.length > 0) {
          console.log('🔍 [UNREAD COUNT DEBUG] Marking', unreadIncoming.length, 'messages as read for lead:', leadId);
          
          await supabase
            .from('conversations')
            .update({ read_at: new Date().toISOString() })
            .in('id', unreadIncoming.map(msg => msg.id));

          console.log('✅ [UNREAD COUNT DEBUG] Messages marked as read, triggering unread count refresh');
          
          // Force refresh of unread count queries immediately
          queryClient.invalidateQueries({ queryKey: ['unread-count'] });
          queryClient.invalidateQueries({ queryKey: ['global-unread-count'] });
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
          
          // Additional manual trigger for global unread count refresh
          window.dispatchEvent(new CustomEvent('unread-count-changed', { detail: { leadId } }));
        }

        return transformedMessages;
      },
      [], // fallback to empty array
      'Load conversation messages'
    );

    setMessages(result);
    setMessagesLoading(false);
  }, [queryClient, safeExecute]);

  // Set up real-time subscription for conversation updates
  useEffect(() => {
    // Clean up existing channel
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
    }

    // Set up new channel for conversation updates with better error handling
    const channel = supabase
      .channel(`conversation-updates-${Date.now()}`, {
        config: {
          presence: {
            key: 'conversation-data'
          }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          console.log('📨 New message received via realtime:', payload);
          
          // Only refresh if this message is for the currently viewed lead
          // and it's not from our own send operation (to avoid double refresh)
          if (currentLeadIdRef.current && 
              payload.new.lead_id === currentLeadIdRef.current &&
              payload.new.direction === 'in') {
            console.log('🔄 Refreshing messages for current lead (incoming message)');
            loadMessages(currentLeadIdRef.current);
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
          console.log('📝 Message updated via realtime:', payload);
          
          // Only refresh if this message is for the currently viewed lead
          if (currentLeadIdRef.current && payload.new.lead_id === currentLeadIdRef.current) {
            console.log('🔄 Refreshing messages for current lead (message update)');
            loadMessages(currentLeadIdRef.current);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
        if (status === 'TIMED_OUT' || status === 'CLOSED') {
          console.warn('⚠️ Realtime connection lost, messages will still work via immediate refresh');
        }
      });

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [loadMessages]);

  const sendMessage = useCallback(async (leadId: string, messageBody: string) => {
    if (!leadId || !messageBody.trim()) {
      throw new Error('Lead ID and message body are required');
    }

    // Create optimistic message to show immediately in UI
    const optimisticMessage: MessageData = {
      id: `temp-${Date.now()}`,
      leadId,
      body: messageBody.trim(),
      direction: 'out',
      sentAt: new Date().toISOString(),
      smsStatus: 'pending',
      aiGenerated: false
    };

    // Add optimistic message immediately
    if (currentLeadIdRef.current === leadId) {
      setMessages(prev => [...prev, optimisticMessage]);
    }

    try {
      // Get the phone number for this lead first
      const { data: phoneData, error: phoneError } = await supabase
        .from('phone_numbers')
        .select('number')
        .eq('lead_id', leadId)
        .eq('is_primary', true)
        .single();

      if (phoneError || !phoneData) {
        // Remove optimistic message on error
        if (currentLeadIdRef.current === leadId) {
          setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        }
        throw new Error('No primary phone number found for this lead');
      }

      // Store the conversation record first
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          lead_id: leadId,
          body: messageBody.trim(),
          direction: 'out',
          ai_generated: false,
          sent_at: new Date().toISOString(),
          sms_status: 'pending'
        })
        .select()
        .single();

      if (conversationError) {
        console.error('Error creating conversation record:', conversationError);
        // Remove optimistic message on error
        if (currentLeadIdRef.current === leadId) {
          setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        }
        throw conversationError;
      }

      console.log('Created conversation record:', conversation.id);

      // Call the send-sms edge function with correct parameters
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: phoneData.number,
          body: messageBody.trim(),
          conversationId: conversation.id
        }
      });

      if (error) {
        console.error('SMS sending error:', error);
        
        // Update conversation with error status
        await supabase
          .from('conversations')
          .update({
            sms_status: 'failed',
            sms_error: `SMS service error: ${error.message || 'Unknown error'}`
          })
          .eq('id', conversation.id);
        
        // Remove optimistic message and refresh to show failed message
        if (currentLeadIdRef.current === leadId) {
          setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
          await loadMessages(leadId);
        }
        
        throw new Error(error.message || 'Failed to send message');
      }

      if (!data?.success) {
        console.error('SMS sending failed:', data);
        
        // Update conversation with error status
        await supabase
          .from('conversations')
          .update({
            sms_status: 'failed',
            sms_error: data?.error || 'Failed to send message'
          })
          .eq('id', conversation.id);
        
        // Remove optimistic message and refresh to show failed message
        if (currentLeadIdRef.current === leadId) {
          setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
          await loadMessages(leadId);
        }
        
        throw new Error(data?.error || 'Failed to send message');
      }

      console.log('Message sent successfully:', data);
      
      // Update conversation with success status
      await supabase
        .from('conversations')
        .update({
          sms_status: 'sent',
          twilio_message_id: data?.telnyxMessageId
        })
        .eq('id', conversation.id);
      
      // Immediately refresh messages to show the real message with correct ID and status
      if (currentLeadIdRef.current === leadId) {
        console.log('🔄 Immediately refreshing messages after successful send');
        await loadMessages(leadId);
      }
      
      // Invalidate relevant queries to refresh data elsewhere in the app
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['lead'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['global-unread-count'] });
      
      return data;
    } catch (error) {
      console.error('Error in sendMessage:', error);
      throw error;
    }
  }, [queryClient, loadMessages, setMessages]);

  // Add manual refresh function for fallback
  const refreshMessages = useCallback(() => {
    if (currentLeadIdRef.current) {
      console.log('🔄 Manual refresh triggered');
      loadMessages(currentLeadIdRef.current);
    }
  }, [loadMessages]);

  return {
    messages,
    messagesLoading,
    messagesError,
    loadMessages,
    sendMessage,
    setMessages,
    refreshMessages
  };
};
