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
    maxReconnectAttempts: 5
  });

  const currentLeadRef = useRef<string | null>(null);
  const channelRef = useRef<any>(null);
  const optimisticMessagesRef = useRef<Map<string, MessageData[]>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load conversations with proper error handling
  const loadConversations = useCallback(async () => {
    if (!profile) return;

    try {
      console.log('🔄 [SIMPLIFIED INBOX] Loading conversations');
      
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          lead_id,
          body,
          direction,
          sent_at,
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

      // Group conversations by lead_id and process
      const conversationsByLead = new Map();
      
      data?.forEach((conv: any) => {
        const leadId = conv.lead_id;
        if (!conversationsByLead.has(leadId)) {
          conversationsByLead.set(leadId, {
            lead: conv.leads,
            messages: []
          });
        }
        conversationsByLead.get(leadId).messages.push({
          body: conv.body,
          direction: conv.direction,
          sent_at: conv.sent_at
        });
      });

      // Process conversations with unread counts
      const processedConversations = await Promise.all(
        Array.from(conversationsByLead.entries()).map(async ([leadId, convData]: [string, any]) => {
          const lead = convData.lead;
          const messages = convData.messages;
          const primaryPhone = lead.phone_numbers.find((p: any) => p.is_primary)?.number || 
                              lead.phone_numbers[0]?.number || '';

          // Get unread count
          const { count: unreadCount } = await supabase
            .from('conversations')
            .select('*', { count: 'exact', head: true })
            .eq('lead_id', leadId)
            .eq('direction', 'in')
            .is('read_at', null);

          // Get last message details
          const lastMessage = messages[0] || { body: 'No messages', direction: null, sent_at: new Date().toISOString() };
          const lastMessageDate = new Date(lastMessage.sent_at);

          return {
            leadId,
            leadName: `${lead.first_name} ${lead.last_name}`.trim(),
            primaryPhone,
            leadPhone: primaryPhone,
            lastMessage: lastMessage.body,
            lastMessageTime: lastMessageDate.toLocaleString(),
            lastMessageDirection: lastMessage.direction as 'in' | 'out' | null,
            unreadCount: unreadCount || 0,
            messageCount: messages.length,
            salespersonId: lead.salesperson_id,
            vehicleInterest: lead.vehicle_interest || 'No vehicle specified',
            status: lead.status || 'new',
            lastMessageDate,
            aiOptIn: false,
            leadSource: 'unknown'
          } as ConversationListItem;
        })
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

      // Remove optimistic message and refresh after successful send
      setTimeout(() => {
        optimisticMessagesRef.current.delete(leadId);
        loadMessages(leadId);
        loadConversations();
        if (onLeadsRefresh) onLeadsRefresh();
      }, 1000);

    } catch (error) {
      console.error('❌ [SIMPLIFIED INBOX] Send message failed:', error);
      
      // Update optimistic message to failed status
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

  // Enhanced realtime subscription with better error handling
  const setupRealtimeSubscription = useCallback(() => {
    if (!profile) return;

    // Clean up existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    console.log('🔗 [SIMPLIFIED INBOX] Setting up enhanced real-time subscription');

    const channel = supabase
      .channel('simplified-inbox-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations'
      }, (payload) => {
        console.log('📨 [SIMPLIFIED INBOX] Real-time update:', payload.eventType);
        
        // Handle different payload structures safely with proper type checking
        const newData = payload.new as Record<string, any> | null;
        const oldData = payload.old as Record<string, any> | null;
        const leadId = newData?.lead_id || oldData?.lead_id;
        
        // Debounced refresh to prevent too many calls
        clearTimeout(reconnectTimeoutRef.current!);
        reconnectTimeoutRef.current = setTimeout(() => {
          loadConversations();
          if (leadId === currentLeadRef.current) {
            loadMessages(currentLeadRef.current);
          }
          if (onLeadsRefresh) onLeadsRefresh();
        }, 500);
      })
      .subscribe((status) => {
        console.log('📡 [SIMPLIFIED INBOX] Subscription status:', status);
        
        setConnectionState(prev => {
          let newState = { ...prev };
          
          switch (status) {
            case 'SUBSCRIBED':
              newState = {
                ...prev,
                isConnected: true,
                status: 'connected',
                lastConnected: new Date(),
                reconnectAttempts: 0
              };
              // Start heartbeat
              if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current);
              }
              heartbeatIntervalRef.current = setInterval(() => {
                // Simple heartbeat check
                if (channel.state === 'closed') {
                  console.log('💔 [SIMPLIFIED INBOX] Connection lost, attempting reconnect');
                  setupRealtimeSubscription();
                }
              }, 30000);
              break;
              
            case 'CHANNEL_ERROR':
            case 'TIMED_OUT':
              newState = {
                ...prev,
                isConnected: false,
                status: prev.reconnectAttempts < prev.maxReconnectAttempts ? 'reconnecting' : 'offline',
                reconnectAttempts: prev.reconnectAttempts + 1
              };
              
              // Retry connection with exponential backoff
              if (newState.reconnectAttempts < newState.maxReconnectAttempts) {
                const delay = Math.min(1000 * Math.pow(2, newState.reconnectAttempts), 30000);
                console.log(`🔄 [SIMPLIFIED INBOX] Reconnecting in ${delay}ms (attempt ${newState.reconnectAttempts})`);
                
                setTimeout(() => {
                  setupRealtimeSubscription();
                }, delay);
              } else {
                console.log('❌ [SIMPLIFIED INBOX] Max reconnection attempts reached');
              }
              break;
              
            case 'CLOSED':
              newState = {
                ...prev,
                isConnected: false,
                status: 'offline'
              };
              break;
              
            default:
              newState = {
                ...prev,
                isConnected: false,
                status: 'connecting'
              };
          }
          
          return newState;
        });
      });

    channelRef.current = channel;
  }, [profile, loadConversations, loadMessages, onLeadsRefresh]);

  // Enhanced manual refresh with connection reset
  const manualRefresh = useCallback(() => {
    console.log('🔄 [SIMPLIFIED INBOX] Manual refresh triggered');
    
    // Reset connection state and try again
    setConnectionState(prev => ({
      ...prev,
      reconnectAttempts: 0,
      status: 'connecting'
    }));
    
    loadConversations();
    if (currentLeadRef.current) {
      loadMessages(currentLeadRef.current);
    }
    if (onLeadsRefresh) onLeadsRefresh();
    
    // Restart realtime subscription
    setupRealtimeSubscription();
  }, [loadConversations, loadMessages, onLeadsRefresh, setupRealtimeSubscription]);

  // Initialize and cleanup
  useEffect(() => {
    if (profile) {
      loadConversations();
      setupRealtimeSubscription();
    }

    return () => {
      // Cleanup all timeouts and intervals
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      
      // Remove channel
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
