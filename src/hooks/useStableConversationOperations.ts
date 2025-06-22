
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ConversationListItem, MessageData } from '@/types/conversation';
import { messageCacheService } from '@/services/messageCacheService';
import { errorHandlingService } from '@/services/errorHandlingService';
import { useMarkAsRead } from '@/hooks/inbox/useMarkAsRead';

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

    // Check cache first
    const cachedConversations = messageCacheService.getCachedConversations();
    if (cachedConversations) {
      console.log('📋 [STABLE OPS] Using cached conversations');
      setConversations(cachedConversations);
      setLoading(false);
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
      messageCacheService.cacheConversations(sortedConversations);
      console.log('✅ [STABLE OPS] Conversations loaded successfully:', sortedConversations.length);

    } catch (err) {
      console.error('❌ [STABLE OPS] Error loading conversations:', err);
      errorHandlingService.handleError(err, {
        operation: 'loadConversations'
      });
      
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

    // Check cache first
    const cachedMessages = messageCacheService.getCachedMessages(leadId);
    if (cachedMessages) {
      console.log('📋 [STABLE OPS] Using cached messages for lead:', leadId);
      setMessages(cachedMessages);
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
      messageCacheService.cacheMessages(leadId, messagesWithContext);
      console.log('✅ [STABLE OPS] Messages loaded successfully:', messagesWithContext.length);
    } catch (err) {
      console.error('❌ [STABLE OPS] Error loading messages:', err);
      errorHandlingService.handleError(err, {
        operation: 'loadMessages',
        leadId
      });
      
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
    if (sendingMessage) {
      console.log('⏳ [STABLE OPS] Already sending message, ignoring');
      return;
    }

    setSendingMessage(true);
    setError(null);

    try {
      console.log('📤 [STABLE OPS] Sending message to lead:', leadId);
      
      // Optimistic update - add message to cache immediately
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        leadId,
        direction: 'out' as const,
        body: message,
        sentAt: new Date().toISOString(),
        readAt: null,
        aiGenerated: false,
        smsStatus: 'pending',
        smsError: null,
        leadSource: '',
        leadName: '',
        vehicleInterest: ''
      };
      
      messageCacheService.addMessageToCache(leadId, optimisticMessage);
      setMessages(prev => [...prev, optimisticMessage]);

      const { error } = await supabase.from('conversations').insert({
        lead_id: leadId,
        direction: 'out',
        body: message,
        ai_generated: false
      });

      if (error) {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        messageCacheService.invalidateLeadCache(leadId);
        throw error;
      }

      // Invalidate cache and reload to get real message
      messageCacheService.invalidateLeadCache(leadId);
      await loadMessages(leadId);
      
      if (onLeadsRefresh) {
        onLeadsRefresh();
      }
      
      console.log('✅ [STABLE OPS] Message sent successfully');
    } catch (err) {
      console.error('❌ [STABLE OPS] Error sending message:', err);
      errorHandlingService.handleError(err, {
        operation: 'sendMessage',
        leadId
      });
      
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setSendingMessage(false);
    }
  }, [loadMessages, onLeadsRefresh, sendingMessage]);

  const manualRefresh = useCallback(() => {
    console.log('🔄 [STABLE OPS] Manual refresh triggered');
    messageCacheService.clearAll();
    loadConversations();
  }, [loadConversations]);

  // Add markAsRead functionality
  const { markAsRead, markingAsRead } = useMarkAsRead(manualRefresh);

  // Initialize conversations on mount
  useEffect(() => {
    console.log('🚀 [STABLE OPS] Initializing Smart Inbox conversations...');
    loadConversations();
  }, [loadConversations]);

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
    setError,
    markAsRead,
    markingAsRead
  };
};
