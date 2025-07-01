
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ConversationListItem, MessageData } from '@/types/conversation';

interface ConversationOperationsProps {
  onLeadsRefresh?: () => void;
}

export const useConversationOperations = ({ onLeadsRefresh }: ConversationOperationsProps = {}) => {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalConversations, setTotalConversations] = useState(0);
  
  const realtimeChannelRef = useRef<any>(null);

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 [DEBUG] Loading conversations...');
      
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select(`
          id,
          first_name,
          last_name,
          email,
          vehicle_interest,
          status,
          salesperson_id,
          source,
          phone_numbers!inner (
            number,
            is_primary
          )
        `)
        .eq('phone_numbers.is_primary', true)
        .order('updated_at', { ascending: false });

      if (leadsError) {
        console.error('❌ [DEBUG] Error loading leads:', leadsError);
        throw leadsError;
      }

      console.log('📊 [DEBUG] Loaded', leadsData?.length || 0, 'leads');

      const transformedConversations: ConversationListItem[] = await Promise.all(
        (leadsData || []).map(async (lead) => {
          // Get latest conversation
          const { data: latestConv } = await supabase
            .from('conversations')
            .select('*')
            .eq('lead_id', lead.id)
            .order('sent_at', { ascending: false })
            .limit(1)
            .single();

          // Get message counts
          const { count: totalCount } = await supabase
            .from('conversations')
            .select('*', { count: 'exact' })
            .eq('lead_id', lead.id);

          const { count: unreadCount } = await supabase
            .from('conversations')
            .select('*', { count: 'exact' })
            .eq('lead_id', lead.id)
            .eq('direction', 'in')
            .is('read_at', null);

          return {
            leadId: lead.id,
            leadName: `${lead.first_name} ${lead.last_name}`,
            leadPhone: lead.phone_numbers?.[0]?.number || '',
            primaryPhone: lead.phone_numbers?.[0]?.number || '',
            leadEmail: lead.email || '',
            vehicleInterest: lead.vehicle_interest || '',
            leadSource: lead.source || 'Unknown',
            leadType: 'prospect',
            lastMessage: latestConv?.body || 'No messages yet',
            lastMessageTime: latestConv 
              ? formatDistanceToNow(new Date(latestConv.sent_at), { addSuffix: true })
              : 'Never',
            lastMessageAt: latestConv?.sent_at || '',
            lastMessageDirection: latestConv?.direction as 'in' | 'out' | null,
            lastMessageDate: latestConv ? new Date(latestConv.sent_at) : new Date(0),
            unreadCount: unreadCount || 0,
            messageCount: totalCount || 0,
            status: lead.status || 'active',
            salespersonId: lead.salesperson_id || null,
            aiGenerated: latestConv?.ai_generated || false
          };
        })
      );

      setConversations(transformedConversations);
      setTotalConversations(transformedConversations.length);
      console.log('✅ [DEBUG] Transformed conversations:', transformedConversations.length);

    } catch (error) {
      console.error('❌ [DEBUG] Error in loadConversations:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (leadId: string) => {
    if (!leadId) return;
    
    setMessagesLoading(true);
    setSelectedLeadId(leadId);
    
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

      console.log('📊 [DEBUG] Loaded', data?.length || 0, 'messages');

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
        console.log('📖 [DEBUG] Marking', unreadMessages.length, 'messages as read');
        
        await supabase
          .from('conversations')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadMessages.map(msg => msg.id));

        // Refresh conversations to update unread counts
        loadConversations();
      }
      
    } catch (error) {
      console.error('❌ [DEBUG] Error in loadMessages:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setMessagesLoading(false);
    }
  }, [loadConversations]);

  const sendMessage = useCallback(async (leadId: string, messageBody: string) => {
    if (!leadId || !messageBody.trim()) {
      throw new Error('Lead ID and message body are required');
    }

    setSendingMessage(true);
    console.log('📤 [DEBUG] Sending message to lead:', leadId);

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

      console.log('✅ [DEBUG] Created conversation record:', conversation.id);

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

      console.log('✅ [DEBUG] SMS sent successfully');
      
      // Update conversation with success
      await supabase
        .from('conversations')
        .update({
          sms_status: 'sent',
          twilio_message_id: data.telnyxMessageId
        })
        .eq('id', conversation.id);
      
      // Refresh data
      await Promise.all([
        loadConversations(),
        loadMessages(leadId)
      ]);
      
      return data;
    } catch (error) {
      console.error('❌ [DEBUG] Error sending message:', error);
      throw error;
    } finally {
      setSendingMessage(false);
    }
  }, [loadConversations, loadMessages]);

  const manualRefresh = useCallback(() => {
    console.log('🔄 [DEBUG] Manual refresh triggered');
    loadConversations();
    if (selectedLeadId) {
      loadMessages(selectedLeadId);
    }
  }, [loadConversations, loadMessages, selectedLeadId]);

  const debugConversationState = useCallback(() => {
    console.log('🔍 [DEBUG] Current state:', {
      conversationsCount: conversations.length,
      messagesCount: messages.length,
      selectedLeadId,
      loading,
      messagesLoading,
      error
    });
  }, [conversations.length, messages.length, selectedLeadId, loading, messagesLoading, error]);

  // Setup real-time subscriptions
  useEffect(() => {
    console.log('🔗 [DEBUG] Setting up real-time subscriptions');

    // Clean up existing channel
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
    }

    const channel = supabase
      .channel('conversation-operations-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          console.log('🔄 [DEBUG] Real-time conversation event:', payload.eventType);
          loadConversations();
          
          if (onLeadsRefresh) {
            onLeadsRefresh();
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 [DEBUG] Subscription status:', status);
      });

    realtimeChannelRef.current = channel;

    return () => {
      console.log('🔌 [DEBUG] Cleaning up real-time subscription');
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [loadConversations, onLeadsRefresh]);

  // Load initial conversations
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    conversations,
    messages,
    selectedLeadId,
    loading,
    messagesLoading,
    sendingMessage,
    error,
    totalConversations,
    loadConversations,
    loadMessages,
    sendMessage,
    manualRefresh,
    debugConversationState,
    setError
  };
};
