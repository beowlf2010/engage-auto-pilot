
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { ConversationListItem, MessageData } from '@/types/conversation';
import { consolidatedSendMessage, validateProfile } from '@/services/consolidatedMessagesService';
import { toast } from '@/hooks/use-toast';

interface UseSimplifiedRealtimeInboxProps {
  onLeadsRefresh?: () => void;
}

export const useSimplifiedRealtimeInbox = ({ onLeadsRefresh }: UseSimplifiedRealtimeInboxProps = {}) => {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [connectionState, setConnectionState] = useState({
    isConnected: false,
    status: 'connecting' as 'connecting' | 'connected' | 'reconnecting' | 'offline',
    lastConnected: null as Date | null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 3
  });

  const currentLeadRef = useRef<string | null>(null);
  const channelRef = useRef<any>(null);
  const optimisticMessagesRef = useRef<Map<string, MessageData[]>>(new Map());

  // Load conversations with proper error handling
  const loadConversations = useCallback(async () => {
    if (!profile) return;

    try {
      console.log('🔄 [SIMPLIFIED INBOX] Loading conversations');
      
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          lead_id,
          leads!inner(
            id,
            first_name,
            last_name,
            phone_numbers!inner(number, is_primary),
            vehicle_interest,
            status,
            salesperson_id
          )
        `)
        .order('sent_at', { ascending: false });

      if (error) throw error;

      // Process conversations with unread counts
      const processedConversations = await Promise.all(
        data?.map(async (conv: any) => {
          const lead = conv.leads;
          const primaryPhone = lead.phone_numbers.find((p: any) => p.is_primary)?.number || 
                              lead.phone_numbers[0]?.number || '';

          // Get unread count
          const { count: unreadCount } = await supabase
            .from('conversations')
            .select('*', { count: 'exact', head: true })
            .eq('lead_id', lead.id)
            .eq('direction', 'in')
            .is('read_at', null);

          // Get last message time
          const { data: lastMessage } = await supabase
            .from('conversations')
            .select('sent_at')
            .eq('lead_id', lead.id)
            .order('sent_at', { ascending: false })
            .limit(1)
            .single();

          return {
            leadId: lead.id,
            leadName: `${lead.first_name} ${lead.last_name}`.trim(),
            leadPhone: primaryPhone,
            vehicleInterest: lead.vehicle_interest || 'No vehicle specified',
            status: lead.status || 'new',
            salespersonId: lead.salesperson_id,
            unreadCount: unreadCount || 0,
            lastMessageTime: lastMessage?.sent_at ? 
              new Date(lastMessage.sent_at).toLocaleString() : 'No messages'
          };
        }) || []
      );

      // Remove duplicates and sort
      const uniqueConversations = processedConversations
        .filter((conv, index, self) => 
          index === self.findIndex(c => c.leadId === conv.leadId)
        )
        .sort((a, b) => b.unreadCount - a.unreadCount);

      setConversations(uniqueConversations);
      console.log('✅ [SIMPLIFIED INBOX] Loaded conversations:', uniqueConversations.length);

    } catch (error) {
      console.error('❌ [SIMPLIFIED INBOX] Error loading conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [profile]);

  // Load messages for a specific lead
  const loadMessages = useCallback(async (leadId: string) => {
    if (!leadId) return;

    try {
      console.log('🔄 [SIMPLIFIED INBOX] Loading messages for lead:', leadId);
      currentLeadRef.current = leadId;

      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: true });

      if (error) throw error;

      const processedMessages: MessageData[] = data.map(msg => ({
        id: msg.id,
        leadId: msg.lead_id,
        direction: msg.direction as 'in' | 'out',
        body: msg.body,
        sentAt: msg.sent_at,
        aiGenerated: msg.ai_generated || false,
        smsStatus: msg.sms_status || 'sent'
      }));

      setMessages(processedMessages);
      console.log('✅ [SIMPLIFIED INBOX] Loaded messages:', processedMessages.length);

    } catch (error) {
      console.error('❌ [SIMPLIFIED INBOX] Error loading messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive"
      });
    }
  }, []);

  // Send message with proper status handling
  const sendMessage = useCallback(async (leadId: string, messageContent: string) => {
    if (!profile || !leadId || !messageContent.trim()) return;

    const validation = validateProfile(profile);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid profile');
    }

    setSendingMessage(true);

    try {
      console.log('📤 [SIMPLIFIED INBOX] Sending message');

      // Create optimistic message
      const optimisticMessage: MessageData = {
        id: `optimistic-${Date.now()}`,
        leadId,
        direction: 'out',
        body: messageContent.trim(),
        sentAt: new Date().toISOString(),
        aiGenerated: false,
        smsStatus: 'sending'
      };

      // Add to optimistic messages
      const current = optimisticMessagesRef.current.get(leadId) || [];
      optimisticMessagesRef.current.set(leadId, [...current, optimisticMessage]);

      // Update UI immediately if viewing this conversation
      if (currentLeadRef.current === leadId) {
        setMessages(prev => [...prev, optimisticMessage]);
      }

      // Send actual message
      const result = await consolidatedSendMessage({
        leadId,
        messageBody: messageContent.trim(),
        profileId: validation.profileId!,
        isAIGenerated: false
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send message');
      }

      // Remove optimistic message and refresh
      setTimeout(() => {
        optimisticMessagesRef.current.delete(leadId);
        loadMessages(leadId);
        loadConversations();
        if (onLeadsRefresh) onLeadsRefresh();
      }, 1000);

    } catch (error) {
      console.error('❌ [SIMPLIFIED INBOX] Send message failed:', error);
      
      // Update optimistic message to failed
      const current = optimisticMessagesRef.current.get(leadId) || [];
      const updated = current.map(msg => 
        msg.smsStatus === 'sending' 
          ? { ...msg, smsStatus: 'failed' as const }
          : msg
      );
      optimisticMessagesRef.current.set(leadId, updated);
      
      if (currentLeadRef.current === leadId) {
        setMessages(prev => prev.map(msg => 
          msg.smsStatus === 'sending' 
            ? { ...msg, smsStatus: 'failed' }
            : msg
        ));
      }

      throw error;
    } finally {
      setSendingMessage(false);
    }
  }, [profile, loadMessages, loadConversations, onLeadsRefresh]);

  // Retry failed message
  const retryMessage = useCallback(async (leadId: string, failedMessageId: string) => {
    const optimisticMessages = optimisticMessagesRef.current.get(leadId) || [];
    const failedMessage = optimisticMessages.find(msg => msg.id === failedMessageId);
    
    if (failedMessage) {
      // Remove failed message
      const filtered = optimisticMessages.filter(msg => msg.id !== failedMessageId);
      optimisticMessagesRef.current.set(leadId, filtered);
      
      if (currentLeadRef.current === leadId) {
        setMessages(prev => prev.filter(msg => msg.id !== failedMessageId));
      }

      // Retry sending
      await sendMessage(leadId, failedMessage.body);
    }
  }, [sendMessage]);

  // Setup real-time subscription
  const setupRealtimeSubscription = useCallback(() => {
    if (!profile || channelRef.current) return;

    console.log('🔗 [SIMPLIFIED INBOX] Setting up real-time subscription');

    const channel = supabase
      .channel('simplified-inbox-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations'
      }, (payload) => {
        console.log('📨 [SIMPLIFIED INBOX] Real-time update:', payload.eventType);
        
        // Debounced refresh
        setTimeout(() => {
          loadConversations();
          if (payload.new?.lead_id === currentLeadRef.current) {
            loadMessages(currentLeadRef.current);
          }
          if (onLeadsRefresh) onLeadsRefresh();
        }, 500);
      })
      .subscribe((status) => {
        console.log('📡 [SIMPLIFIED INBOX] Subscription status:', status);
        
        setConnectionState(prev => ({
          ...prev,
          isConnected: status === 'SUBSCRIBED',
          status: status === 'SUBSCRIBED' ? 'connected' : 'connecting',
          lastConnected: status === 'SUBSCRIBED' ? new Date() : prev.lastConnected
        }));
      });

    channelRef.current = channel;
  }, [profile, loadConversations, loadMessages, onLeadsRefresh]);

  // Manual refresh
  const manualRefresh = useCallback(() => {
    console.log('🔄 [SIMPLIFIED INBOX] Manual refresh triggered');
    loadConversations();
    if (currentLeadRef.current) {
      loadMessages(currentLeadRef.current);
    }
    if (onLeadsRefresh) onLeadsRefresh();
  }, [loadConversations, loadMessages, onLeadsRefresh]);

  // Initialize
  useEffect(() => {
    if (profile) {
      loadConversations();
      setupRealtimeSubscription();
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [profile, loadConversations, setupRealtimeSubscription]);

  return {
    conversations,
    messages,
    loading,
    sendingMessage,
    connectionState,
    loadMessages,
    sendMessage,
    retryMessage,
    manualRefresh
  };
};
