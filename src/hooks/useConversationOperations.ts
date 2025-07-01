
import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import type { ConversationListItem, MessageData } from '@/types/conversation';

export const useConversationOperations = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const realtimeChannelRef = useRef<any>(null);

  // Enhanced conversation loading with debug logging
  const { data: conversations = [], isLoading: conversationsLoading, refetch: refetchConversations } = useQuery({
    queryKey: ['conversations', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      console.log('🔄 [DEBUG] Loading conversations for profile:', profile.id);
      
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
            ai_generated
          )
        `)
        .eq('phone_numbers.is_primary', true)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('❌ [DEBUG] Error loading conversations:', error);
        throw error;
      }

      console.log('📊 [DEBUG] Raw leads data:', data?.length || 0, 'leads');

      const transformedConversations: ConversationListItem[] = (data || []).map(lead => {
        const conversations = lead.conversations || [];
        const lastMessage = conversations
          .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0];

        const unreadCount = conversations.filter(conv => 
          conv.direction === 'in' && !conv.read_at
        ).length;

        console.log(`📝 [DEBUG] Lead ${lead.id}:`, {
          name: `${lead.first_name} ${lead.last_name}`,
          totalMessages: conversations.length,
          unreadCount,
          lastMessage: lastMessage?.body?.substring(0, 50) + '...' || 'No messages',
          lastMessageDirection: lastMessage?.direction || 'none'
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

      console.log('✅ [DEBUG] Transformed conversations:', transformedConversations.length);
      return transformedConversations;
    },
    enabled: !!profile?.id,
    staleTime: 30000,
    refetchInterval: 60000
  });

  // Enhanced message loading with detailed debugging
  const loadMessages = useCallback(async (leadId: string) => {
    if (!leadId) return;
    
    setMessagesLoading(true);
    setError(null);
    
    try {
      console.log('📨 [DEBUG] Loading messages for lead:', leadId);
      
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: true });

      if (error) {
        console.error('❌ [DEBUG] Error loading messages:', error);
        setError(error.message);
        return;
      }

      console.log('📊 [DEBUG] Raw messages data:', {
        leadId,
        totalMessages: data?.length || 0,
        messages: data?.map(msg => ({
          id: msg.id,
          direction: msg.direction,
          body: msg.body.substring(0, 50) + '...',
          sentAt: msg.sent_at,
          readAt: msg.read_at
        })) || []
      });

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

      console.log('✅ [DEBUG] Transformed messages:', {
        leadId,
        count: transformedMessages.length,
        inbound: transformedMessages.filter(m => m.direction === 'in').length,
        outbound: transformedMessages.filter(m => m.direction === 'out').length,
        unread: transformedMessages.filter(m => m.direction === 'in' && !m.readAt).length
      });

      setMessages(transformedMessages);
      setSelectedLeadId(leadId);
      
      // Mark incoming messages as read and log the process
      const unreadIncoming = data?.filter(msg => msg.direction === 'in' && !msg.read_at) || [];
      if (unreadIncoming.length > 0) {
        console.log('📖 [DEBUG] Marking', unreadIncoming.length, 'messages as read');
        
        await supabase
          .from('conversations')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadIncoming.map(msg => msg.id));

        console.log('✅ [DEBUG] Messages marked as read, invalidating queries');
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }
      
    } catch (error) {
      console.error('❌ [DEBUG] Error in loadMessages:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setMessagesLoading(false);
    }
  }, [queryClient]);

  // Enhanced real-time subscription with debug logging
  useEffect(() => {
    if (!profile?.id) return;

    console.log('🔗 [DEBUG] Setting up real-time subscription');

    // Clean up existing channel
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
    }

    const channel = supabase
      .channel('conversation-updates-debug')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          console.log('🔄 [DEBUG] Real-time INSERT:', {
            leadId: payload.new.lead_id,
            direction: payload.new.direction,
            body: payload.new.body?.substring(0, 50) + '...',
            timestamp: payload.new.sent_at
          });
          
          // Refresh conversations list
          refetchConversations();
          
          // If this is for the currently selected lead, reload messages
          if (selectedLeadId && payload.new.lead_id === selectedLeadId) {
            console.log('🔄 [DEBUG] Reloading messages for current lead');
            loadMessages(selectedLeadId);
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
          console.log('🔄 [DEBUG] Real-time UPDATE:', {
            leadId: payload.new.lead_id,
            direction: payload.new.direction,
            changes: payload.new
          });
          
          // Refresh conversations list
          refetchConversations();
          
          // If this is for the currently selected lead, reload messages
          if (selectedLeadId && payload.new.lead_id === selectedLeadId) {
            console.log('🔄 [DEBUG] Reloading messages for current lead');
            loadMessages(selectedLeadId);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 [DEBUG] Real-time subscription status:', status);
      });

    realtimeChannelRef.current = channel;

    return () => {
      console.log('🔌 [DEBUG] Cleaning up real-time subscription');
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [profile?.id, selectedLeadId, loadMessages, refetchConversations]);

  // Enhanced send message with debug logging
  const sendMessage = useCallback(async (leadId: string, messageBody: string) => {
    if (!leadId || !messageBody.trim()) {
      throw new Error('Lead ID and message body are required');
    }

    setSendingMessage(true);
    console.log('📤 [DEBUG] Sending message:', {
      leadId,
      messageLength: messageBody.length,
      timestamp: new Date().toISOString()
    });

    try {
      // Get the phone number for this lead
      const { data: phoneData, error: phoneError } = await supabase
        .from('phone_numbers')
        .select('number')
        .eq('lead_id', leadId)
        .eq('is_primary', true)
        .single();

      if (phoneError || !phoneData) {
        console.error('❌ [DEBUG] No phone number found:', phoneError);
        throw new Error('No primary phone number found for this lead');
      }

      console.log('📞 [DEBUG] Found phone number:', phoneData.number);

      // Store the conversation record
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
        console.error('❌ [DEBUG] Error creating conversation:', conversationError);
        throw conversationError;
      }

      console.log('✅ [DEBUG] Conversation record created:', conversation.id);

      // Send SMS
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: phoneData.number,
          body: messageBody.trim(),
          conversationId: conversation.id
        }
      });

      if (error) {
        console.error('❌ [DEBUG] SMS send error:', error);
        
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
        console.error('❌ [DEBUG] SMS send failed:', data);
        
        await supabase
          .from('conversations')
          .update({
            sms_status: 'failed',
            sms_error: data?.error || 'Failed to send message'
          })
          .eq('id', conversation.id);
        
        throw new Error(data?.error || 'Failed to send message');
      }

      console.log('✅ [DEBUG] SMS sent successfully:', data);
      
      // Update conversation status
      await supabase
        .from('conversations')
        .update({
          sms_status: 'sent',
          twilio_message_id: data?.telnyxMessageId
        })
        .eq('id', conversation.id);
      
      // Force refresh data
      console.log('🔄 [DEBUG] Refreshing data after send');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      
      // Reload messages for current conversation
      if (selectedLeadId === leadId) {
        await loadMessages(leadId);
      }
      
      return data;
    } catch (error) {
      console.error('❌ [DEBUG] Error in sendMessage:', error);
      throw error;
    } finally {
      setSendingMessage(false);
    }
  }, [queryClient, selectedLeadId, loadMessages]);

  // Manual refresh function with debug logging
  const manualRefresh = useCallback(() => {
    console.log('🔄 [DEBUG] Manual refresh triggered');
    refetchConversations();
    if (selectedLeadId) {
      loadMessages(selectedLeadId);
    }
  }, [refetchConversations, selectedLeadId, loadMessages]);

  // Debug function to check conversation state
  const debugConversationState = useCallback(() => {
    console.log('🔍 [DEBUG] Current conversation state:', {
      selectedLeadId,
      messagesCount: messages.length,
      conversationsCount: conversations.length,
      messagesLoading,
      sendingMessage,
      error
    });
  }, [selectedLeadId, messages.length, conversations.length, messagesLoading, sendingMessage, error]);

  return {
    conversations,
    messages,
    selectedLeadId,
    loading: conversationsLoading,
    messagesLoading,
    sendingMessage,
    error,
    totalConversations: conversations.length,
    loadMessages,
    sendMessage,
    manualRefresh,
    debugConversationState,
    setError
  };
};
