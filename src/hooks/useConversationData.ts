import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MessageData } from '@/types/conversation';

export const useConversationData = () => {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const currentLeadIdRef = useRef<string | null>(null);
  const realtimeChannelRef = useRef<any>(null);

  const loadMessages = useCallback(async (leadId: string) => {
    if (!leadId) return;
    
    setMessagesLoading(true);
    setMessagesError(null);
    currentLeadIdRef.current = leadId;
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        setMessagesError(error.message);
        return;
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

      setMessages(transformedMessages);
      
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
      
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessagesError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setMessagesLoading(false);
    }
  }, [queryClient]);

  // Set up real-time subscription for conversation updates
  useEffect(() => {
    // Clean up existing channel
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
    }

    // Set up new channel for conversation updates
    const channel = supabase
      .channel('conversation-updates')
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
          if (currentLeadIdRef.current && payload.new.lead_id === currentLeadIdRef.current) {
            console.log('🔄 Refreshing messages for current lead');
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
            console.log('🔄 Refreshing messages for current lead');
            loadMessages(currentLeadIdRef.current);
          }
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
  }, [loadMessages]);

  const sendMessage = useCallback(async (leadId: string, messageBody: string) => {
    if (!leadId || !messageBody.trim()) {
      throw new Error('Lead ID and message body are required');
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
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['lead'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['global-unread-count'] });
      
      return data;
    } catch (error) {
      console.error('Error in sendMessage:', error);
      throw error;
    }
  }, [queryClient]);

  return {
    messages,
    messagesLoading,
    messagesError,
    loadMessages,
    sendMessage,
    setMessages
  };
};
