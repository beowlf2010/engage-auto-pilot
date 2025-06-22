import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ConversationListItem, MessageData } from '@/types/conversation';

interface ConversationOperationsProps {
  onLeadsRefresh?: () => void;
}

export const useStableConversationOperations = ({ onLeadsRefresh }: ConversationOperationsProps = {}) => {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const loadingRef = useRef(false);
  const loadingMessagesRef = useRef(false);

  const loadConversations = useCallback(async () => {
    if (loadingRef.current) {
      console.log('⏳ [STABLE OPS] Conversations already loading, skipping');
      return;
    }
    
    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      
      console.log('🔄 [STABLE OPS] Loading conversations with source data...');
      
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select(`
          id,
          first_name,
          last_name,
          vehicle_interest,
          status,
          salesperson_id,
          ai_opt_in,
          source,
          created_at,
          profiles!inner(first_name, last_name)
        `)
        .not('ai_opt_in', 'is', null);

      if (leadsError) {
        console.error('❌ [STABLE OPS] Error loading leads:', leadsError);
        throw leadsError;
      }

      const conversationsData = await Promise.all(
        (leadsData || []).map(async (lead) => {
          const { data: latestConversation, error: conversationError } = await supabase
            .from('conversations')
            .select('*')
            .eq('lead_id', lead.id)
            .order('sent_at', { ascending: false })
            .limit(1)
            .single();

          if (conversationError && conversationError.code !== 'PGRST116') {
            console.error('Error fetching latest conversation:', conversationError);
          }

          const { data: phoneNumbers, error: phoneError } = await supabase
            .from('phone_numbers')
            .select('number')
            .eq('lead_id', lead.id)
            .eq('is_primary', true)
            .single();

          if (phoneError && phoneError.code !== 'PGRST116') {
            console.error('Error fetching phone number:', phoneError);
          }

          const phoneNumber = phoneNumbers ? phoneNumbers.number : null;

          const { count: unreadCount, error: unreadError } = await supabase
            .from('conversations')
            .select('*', { count: 'exact' })
            .eq('lead_id', lead.id)
            .is('read_at', null);

          if (unreadError) {
            console.error('Error fetching unread count:', unreadError);
          }

          const { data: incoming, error: incomingError } = await supabase
            .from('conversations')
            .select('*', { count: 'exact' })
            .eq('lead_id', lead.id)
            .eq('direction', 'in');

          if (incomingError) {
            console.error('Error fetching incoming count:', incomingError);
          }

          const { data: outgoing, error: outgoingError } = await supabase
            .from('conversations')
            .select('*', { count: 'exact' })
            .eq('lead_id', lead.id)
            .eq('direction', 'out');

          if (outgoingError) {
            console.error('Error fetching outgoing count:', outgoingError);
          }

          const incomingCount = incoming ? incoming.length : 0;
          const outgoingCount = outgoing ? outgoing.length : 0;

          return {
            leadId: lead.id,
            leadName: `${lead.first_name} ${lead.last_name}`,
            leadPhone: phoneNumber || 'No phone',
            primaryPhone: phoneNumber || 'No phone',
            vehicleInterest: lead.vehicle_interest || 'Unknown',
            leadSource: lead.source || 'Unknown',
            unreadCount: unreadCount || 0,
            messageCount: incomingCount + outgoingCount,
            lastMessage: latestConversation?.body || 'No messages yet',
            lastMessageTime: latestConversation 
              ? formatDistanceToNow(new Date(latestConversation.sent_at), { addSuffix: true })
              : 'Never',
            lastMessageDirection: latestConversation?.direction as 'in' | 'out' | null,
            lastMessageDate: latestConversation ? new Date(latestConversation.sent_at) : new Date(0),
            status: lead.status || 'new',
            salespersonId: lead.salesperson_id,
            salespersonName: lead.profiles?.first_name && lead.profiles?.last_name 
              ? `${lead.profiles.first_name} ${lead.profiles.last_name}`
              : undefined,
            aiOptIn: lead.ai_opt_in,
            incomingCount: incomingCount,
            outgoingCount: outgoingCount
          };
        })
      );

      const sortedConversations = conversationsData.sort((a, b) => {
        const aTime = a.lastMessageDate?.getTime() || 0;
        const bTime = b.lastMessageDate?.getTime() || 0;
        return bTime - aTime;
      });

      setConversations(sortedConversations);
      console.log('✅ [STABLE OPS] Conversations loaded successfully:', sortedConversations.length);

    } catch (err) {
      console.error('❌ [STABLE OPS] Error loading conversations:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (leadId: string) => {
    if (loadingMessagesRef.current) {
      console.log('⏳ [STABLE OPS] Messages already loading for another lead, skipping');
      return;
    }

    try {
      loadingMessagesRef.current = true;
      setError(null);

      console.log('📬 [STABLE OPS] Loading messages for lead:', leadId);
      
      const { data: leadData } = await supabase
        .from('leads')
        .select('first_name, last_name, vehicle_interest, source')
        .eq('id', leadId)
        .single();

      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: true });

      if (error) {
        console.error('❌ [STABLE OPS] Error fetching messages:', error);
        throw error;
      }

      const messagesWithContext = (data || []).map(msg => ({
        id: msg.id,
        leadId,
        direction: msg.direction as 'in' | 'out',
        body: msg.body,
        sentAt: msg.sent_at,
        readAt: msg.read_at,
        aiGenerated: msg.ai_generated || false,
        smsStatus: msg.sms_status || 'pending',
        smsError: msg.sms_error,
        leadSource: leadData?.source,
        leadName: leadData ? `${leadData.first_name} ${leadData.last_name}` : 'Unknown',
        vehicleInterest: leadData?.vehicle_interest || 'Unknown'
      }));

      setMessages(messagesWithContext);
      console.log('✅ [STABLE OPS] Messages loaded successfully:', messagesWithContext.length);
    } catch (err) {
      console.error('❌ [STABLE OPS] Error loading messages:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      loadingMessagesRef.current = false;
    }
  }, []);

  const sendMessage = useCallback(async (leadId: string, message: string) => {
    if (setSendingMessage) {
      console.log('⏳ [STABLE OPS] Already sending message, ignoring');
      return;
    }

    setSendingMessage(true);
    setError(null);

    try {
      console.log('📤 [STABLE OPS] Sending message to lead:', leadId);
      
      const { error } = await supabase.from('conversations').insert({
        lead_id: leadId,
        direction: 'out',
        body: message,
        ai_generated: false
      });

      if (error) {
        console.error('❌ [STABLE OPS] Error sending message:', error);
        throw error;
      }

      await loadMessages(leadId);
      if (onLeadsRefresh) {
        onLeadsRefresh();
      }
      
      console.log('✅ [STABLE OPS] Message sent successfully');
    } catch (err) {
      console.error('❌ [STABLE OPS] Error sending message:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setSendingMessage(false);
    }
  }, [loadMessages, onLeadsRefresh]);

  const manualRefresh = useCallback(() => {
    console.log('🔄 [STABLE OPS] Manual refresh triggered');
    loadConversations();
  }, [loadConversations]);

  // Initialize conversations on mount - this was missing!
  useEffect(() => {
    console.log('🚀 [STABLE OPS] Initializing Smart Inbox conversations...');
    loadConversations();
  }, []); // Empty dependency array ensures this runs only once

  return {
    conversations,
    messages,
    loading,
    error,
    sendingMessage,
    loadConversations,
    loadMessages,
    sendMessage,
    manualRefresh,
    setError
  };
};
