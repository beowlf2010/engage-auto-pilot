
import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import type { ConversationListItem, MessageData } from '@/types/conversation';

interface UseOptimizedInboxProps {
  onLeadsRefresh?: () => void;
}

export const useOptimizedInbox = ({ onLeadsRefresh }: UseOptimizedInboxProps = {}) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const realtimeChannelRef = useRef<any>(null);
  const currentLeadIdRef = useRef<string | null>(null);

  // Enhanced conversations query with better error handling
  const { 
    data: conversations = [], 
    isLoading: loading, 
    refetch: refetchConversations,
    error: conversationsError 
  } = useQuery({
    queryKey: ['optimized-conversations', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      console.log('🔄 [OPTIMIZED INBOX] Loading conversations...');
      
      const { data, error } = await supabase
        .from('leads')
        .select(`
          id,
          first_name,
          last_name,
          phone_numbers!inner (
            number,
            is_primary
          ),
          vehicle_interest,
          status,
          salesperson_id,
          conversations (
            id,
            body,
            direction,
            sent_at,
            read_at,
            ai_generated,
            sms_status
          )
        `)
        .eq('phone_numbers.is_primary', true)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('❌ [OPTIMIZED INBOX] Error loading conversations:', error);
        throw error;
      }

      console.log('📊 [OPTIMIZED INBOX] Loaded', data?.length || 0, 'leads');

      const transformedConversations: ConversationListItem[] = (data || []).map(lead => {
        const conversations = lead.conversations || [];
        const sortedConversations = conversations.sort((a, b) => 
          new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
        );
        const lastMessage = sortedConversations[0];
        const unreadCount = conversations.filter(conv => 
          conv.direction === 'in' && !conv.read_at
        ).length;

        console.log(`📝 [OPTIMIZED INBOX] Lead ${lead.first_name} ${lead.last_name}:`, {
          totalMessages: conversations.length,
          unreadCount,
          lastMessageDirection: lastMessage?.direction || 'none',
          lastMessageStatus: lastMessage?.sms_status || 'none'
        });

        return {
          leadId: lead.id,
          leadName: `${lead.first_name} ${lead.last_name}`,
          leadPhone: lead.phone_numbers?.[0]?.number || '',
          vehicleInterest: lead.vehicle_interest || '',
          lastMessage: lastMessage?.body || '',
          lastMessageAt: lastMessage?.sent_at || '',
          lastMessageDirection: lastMessage?.direction || 'out',
          unreadCount,
          status: lead.status || 'active',
          salespersonId: lead.salesperson_id || null,
          aiGenerated: lastMessage?.ai_generated || false
        };
      });

      console.log('✅ [OPTIMIZED INBOX] Processed', transformedConversations.length, 'conversations');
      return transformedConversations;
    },
    enabled: !!profile?.id,
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 3
  });

  // Enhanced real-time subscription with comprehensive event handling
  useEffect(() => {
    if (!profile?.id) return;

    console.log('🔗 [OPTIMIZED INBOX] Setting up enhanced real-time subscription');

    // Clean up existing channel
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
    }

    const channel = supabase
      .channel('optimized-inbox-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          console.log('🔄 [OPTIMIZED INBOX] Real-time event:', {
            event: payload.eventType,
            leadId: payload.new?.lead_id || payload.old?.lead_id,
            direction: payload.new?.direction || payload.old?.direction,
            timestamp: new Date().toISOString()
          });

          // Always refresh conversations list
          refetchConversations();

          // Trigger leads refresh if callback provided
          if (onLeadsRefresh) {
            onLeadsRefresh();
          }

          // If this affects the current conversation, reload messages
          const affectedLeadId = payload.new?.lead_id || payload.old?.lead_id;
          if (currentLeadIdRef.current && affectedLeadId === currentLeadIdRef.current) {
            console.log('🔄 [OPTIMIZED INBOX] Reloading messages for current conversation');
            loadMessages(currentLeadIdRef.current);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads'
        },
        (payload) => {
          console.log('🔄 [OPTIMIZED INBOX] Lead updated:', payload.eventType);
          refetchConversations();
          if (onLeadsRefresh) {
            onLeadsRefresh();
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 [OPTIMIZED INBOX] Subscription status:', status);
      });

    realtimeChannelRef.current = channel;

    return () => {
      console.log('🔌 [OPTIMIZED INBOX] Cleaning up real-time subscription');
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [profile?.id, refetchConversations, onLeadsRefresh]);

  // Enhanced message loading with better error handling
  const loadMessages = useCallback(async (leadId: string) => {
    if (!leadId) return;
    
    setMessagesLoading(true);
    setError(null);
    currentLeadIdRef.current = leadId;
    
    try {
      console.log('📨 [OPTIMIZED INBOX] Loading messages for lead:', leadId);
      
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: true });

      if (error) {
        console.error('❌ [OPTIMIZED INBOX] Error loading messages:', error);
        setError(error.message);
        return;
      }

      console.log('📊 [OPTIMIZED INBOX] Loaded', data?.length || 0, 'messages');

      const transformedMessages: MessageData[] = (data || []).map(msg => ({
        id: msg.id,
        leadId: msg.lead_id,
        body: msg.body,
        direction: msg.direction as 'in' | 'out',
        sentAt: msg.sent_at,
        smsStatus: msg.sms_status || 'delivered',
        aiGenerated: msg.ai_generated || false,
        readAt: msg.read_at
      }));

      setMessages(transformedMessages);
      
      // Mark unread messages as read
      const unreadMessages = data?.filter(msg => msg.direction === 'in' && !msg.read_at) || [];
      if (unreadMessages.length > 0) {
        console.log('📖 [OPTIMIZED INBOX] Marking', unreadMessages.length, 'messages as read');
        
        await supabase
          .from('conversations')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadMessages.map(msg => msg.id));

        // Refresh conversations to update unread counts
        refetchConversations();
      }
      
    } catch (error) {
      console.error('❌ [OPTIMIZED INBOX] Error in loadMessages:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setMessagesLoading(false);
    }
  }, [refetchConversations]);

  // Enhanced send message function
  const sendMessage = useCallback(async (leadId: string, messageBody: string) => {
    if (!leadId || !messageBody.trim()) {
      throw new Error('Lead ID and message body are required');
    }

    setSendingMessage(true);
    console.log('📤 [OPTIMIZED INBOX] Sending message to lead:', leadId);

    try {
      // Get phone number
      const { data: phoneData, error: phoneError } = await supabase
        .from('phone_numbers')
        .select('number')
        .eq('lead_id', leadId)
        .eq('is_primary', true)
        .single();

      if (phoneError || !phoneData) {
        throw new Error('No primary phone number found for this lead');
      }

      // Create conversation record
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
        throw conversationError;
      }

      console.log('✅ [OPTIMIZED INBOX] Created conversation record:', conversation.id);

      // Send SMS
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: phoneData.number,
          body: messageBody.trim(),
          conversationId: conversation.id
        }
      });

      if (error || !data?.success) {
        const errorMsg = error?.message || data?.error || 'Failed to send message';
        
        // Update conversation with error
        await supabase
          .from('conversations')
          .update({
            sms_status: 'failed',
            sms_error: errorMsg
          })
          .eq('id', conversation.id);
        
        throw new Error(errorMsg);
      }

      console.log('✅ [OPTIMIZED INBOX] SMS sent successfully');
      
      // Update conversation with success
      await supabase
        .from('conversations')
        .update({
          sms_status: 'sent',
          twilio_message_id: data.telnyxMessageId
        })
        .eq('id', conversation.id);
      
      // Force refresh
      queryClient.invalidateQueries({ queryKey: ['optimized-conversations'] });
      
      // Reload messages if this is the current conversation
      if (currentLeadIdRef.current === leadId) {
        await loadMessages(leadId);
      }
      
      return data;
    } catch (error) {
      console.error('❌ [OPTIMIZED INBOX] Error sending message:', error);
      throw error;
    } finally {
      setSendingMessage(false);
    }
  }, [queryClient, loadMessages]);

  // Manual refresh
  const manualRefresh = useCallback(() => {
    console.log('🔄 [OPTIMIZED INBOX] Manual refresh triggered');
    refetchConversations();
    if (currentLeadIdRef.current) {
      loadMessages(currentLeadIdRef.current);
    }
  }, [refetchConversations, loadMessages]);

  // Set error from conversations query
  useEffect(() => {
    if (conversationsError) {
      setError(conversationsError.message);
    }
  }, [conversationsError]);

  return {
    conversations,
    messages,
    loading,
    messagesLoading,
    sendingMessage,
    error,
    totalConversations: conversations.length,
    loadMessages,
    sendMessage,
    manualRefresh,
    setError
  };
};
