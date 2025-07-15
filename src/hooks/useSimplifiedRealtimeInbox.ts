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
      
      // Use the new optimized function with phone data already included and limited results
      const { data, error } = await supabase.rpc('get_inbox_conversations_prioritized_limited');

      if (error) throw error;

      // Process conversations directly from the optimized function
      const processedConversations: ConversationListItem[] = (data || []).map(conv => ({
        leadId: conv.lead_id,
        leadName: `${conv.first_name} ${conv.last_name}`.trim(),
        primaryPhone: conv.primary_phone || '',
        leadPhone: conv.primary_phone || '',
        leadEmail: conv.email || '',
        lastMessage: conv.body || 'No messages',
        lastMessageTime: new Date(conv.sent_at).toLocaleString(),
        lastMessageDirection: conv.direction as 'in' | 'out' | null,
        unreadCount: Number(conv.unread_count) || 0,
        messageCount: 1,
        salespersonId: conv.salesperson_id,
        vehicleInterest: conv.vehicle_interest || 'No vehicle specified',
        leadSource: conv.source || 'unknown',
        leadType: conv.lead_type_name || 'unknown',
        status: conv.status || 'new',
        lastMessageDate: new Date(conv.sent_at),
        aiOptIn: conv.ai_opt_in || false,
        salespersonName: conv.profiles_first_name && conv.profiles_last_name ? 
          `${conv.profiles_first_name} ${conv.profiles_last_name}` : undefined
      }));

      // Remove duplicates and sort by unread count then by last message date
      const uniqueConversations = processedConversations
        .filter((conv, index, self) => 
          index === self.findIndex(c => c.leadId === conv.leadId)
        )
        .sort((a, b) => {
          // First sort by unread count
          if (b.unreadCount !== a.unreadCount) {
            return b.unreadCount - a.unreadCount;
          }
          // Then by last message date
          return b.lastMessageDate.getTime() - a.lastMessageDate.getTime();
        });

      setConversations(uniqueConversations);
      console.log('✅ [SIMPLIFIED INBOX] Loaded conversations (OPTIMIZED):', uniqueConversations.length);

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
