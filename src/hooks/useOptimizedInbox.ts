
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { ConversationListItem, MessageData } from '@/types/conversation';
import { messageCacheService } from '@/services/messageCacheService';
import { toast } from '@/hooks/use-toast';

interface UseOptimizedInboxProps {
  onLeadsRefresh?: () => void;
}

export const useOptimizedInbox = ({ onLeadsRefresh }: UseOptimizedInboxProps = {}) => {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [totalConversations, setTotalConversations] = useState(0);
  
  // Debouncing refs
  const loadConversationsDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const loadMessagesDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastLoadTimeRef = useRef<number>(0);

  // Debounced load conversations
  const loadConversations = useCallback(async () => {
    // Clear any pending debounced calls
    if (loadConversationsDebounceRef.current) {
      clearTimeout(loadConversationsDebounceRef.current);
    }

    // Debounce rapid calls (minimum 500ms between calls)
    const now = Date.now();
    if (now - lastLoadTimeRef.current < 500) {
      loadConversationsDebounceRef.current = setTimeout(loadConversations, 500);
      return;
    }
    lastLoadTimeRef.current = now;

    if (!profile?.id) return;

    try {
      setError(null);
      
      // Build query based on user role - using only existing columns
      let query = supabase
        .from('leads')
        .select(`
          id,
          first_name,
          last_name,
          phone,
          email,
          vehicle_interest,
          source,
          status,
          salesperson_id,
          ai_opt_in,
          message_intensity,
          created_at,
          conversations!inner(
            id,
            body,
            direction,
            sent_at,
            ai_generated
          )
        `)
        .order('created_at', { ascending: false });

      // Apply role-based filtering
      if (profile.role === 'sales') {
        query = query.or(`salesperson_id.eq.${profile.id},salesperson_id.is.null`);
      }

      const { data: leadsData, error: leadsError } = await query.limit(100);

      if (leadsError) throw leadsError;

      if (!leadsData) {
        setConversations([]);
        setTotalConversations(0);
        return;
      }

      // Process conversations
      const conversationMap = new Map<string, ConversationListItem>();

      leadsData.forEach(lead => {
        if (!lead.conversations || lead.conversations.length === 0) return;

        const lastMessage = lead.conversations
          .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0];

        const unreadCount = lead.conversations.filter(
          msg => msg.direction === 'in' && 
          new Date(msg.sent_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length;

        conversationMap.set(lead.id, {
          leadId: lead.id,
          leadName: `${lead.first_name} ${lead.last_name}`,
          leadPhone: lead.phone || '',
          primaryPhone: lead.phone || '',
          leadEmail: lead.email || '',
          vehicleInterest: lead.vehicle_interest || '',
          leadSource: lead.source || '',
          leadType: '',
          status: lead.status || 'new',
          salespersonId: lead.salesperson_id,
          aiOptIn: lead.ai_opt_in || false,
          messageIntensity: lead.message_intensity || 'standard',
          lastMessage: lastMessage?.body || '',
          lastMessageTime: lastMessage ? new Date(lastMessage.sent_at).toLocaleString() : '',
          lastMessageDate: new Date(lastMessage?.sent_at || lead.created_at),
          lastMessageDirection: lastMessage?.direction as 'in' | 'out' | null,
          unreadCount,
          messageCount: lead.conversations.length,
          isAiGenerated: lastMessage?.ai_generated || false
        });
      });

      const conversationsArray = Array.from(conversationMap.values());
      setConversations(conversationsArray);
      setTotalConversations(conversationsArray.length);

      console.log('✅ [OPTIMIZED INBOX] Loaded conversations:', conversationsArray.length);

    } catch (error) {
      console.error('❌ [OPTIMIZED INBOX] Error loading conversations:', error);
      setError(error instanceof Error ? error.message : 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [profile?.id, profile?.role]);

  // Debounced load messages
  const loadMessages = useCallback(async (leadId: string) => {
    // Clear any pending debounced calls
    if (loadMessagesDebounceRef.current) {
      clearTimeout(loadMessagesDebounceRef.current);
    }

    // Check cache first
    const cachedMessages = messageCacheService.getCachedMessages(leadId);
    if (cachedMessages) {
      setMessages(cachedMessages);
      return;
    }

    // Debounce rapid calls
    loadMessagesDebounceRef.current = setTimeout(async () => {
      try {
        setError(null);

        const { data: messagesData, error: messagesError } = await supabase
          .from('conversations')
          .select('*')
          .eq('lead_id', leadId)
          .order('sent_at', { ascending: true });

        if (messagesError) throw messagesError;

        const formattedMessages: MessageData[] = (messagesData || []).map(msg => ({
          id: msg.id,
          leadId: msg.lead_id,
          direction: msg.direction as 'in' | 'out',
          body: msg.body,
          sentAt: msg.sent_at,
          aiGenerated: msg.ai_generated || false,
          smsStatus: msg.sms_status,
          smsError: msg.sms_error
        }));

        // Cache messages
        messageCacheService.cacheMessages(leadId, formattedMessages);
        setMessages(formattedMessages);

        console.log('✅ [OPTIMIZED INBOX] Loaded messages for lead:', leadId, formattedMessages.length);

      } catch (error) {
        console.error('❌ [OPTIMIZED INBOX] Error loading messages:', error);
        setError(error instanceof Error ? error.message : 'Failed to load messages');
      }
    }, 100); // 100ms debounce
  }, []);

  // Send message
  const sendMessage = useCallback(async (leadId: string, messageContent: string) => {
    setSendingMessage(true);
    try {
      const { error: insertError } = await supabase
        .from('conversations')
        .insert({
          lead_id: leadId,
          direction: 'out',
          body: messageContent.trim(),
          sent_at: new Date().toISOString(),
          ai_generated: false
        });

      if (insertError) throw insertError;

      // Invalidate cache and reload
      messageCacheService.invalidateLeadCache(leadId);
      await Promise.all([
        loadMessages(leadId),
        loadConversations()
      ]);

      console.log('✅ [OPTIMIZED INBOX] Message sent successfully');

    } catch (error) {
      console.error('❌ [OPTIMIZED INBOX] Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setSendingMessage(false);
    }
  }, [loadMessages, loadConversations]);

  // Manual refresh
  const manualRefresh = useCallback(() => {
    console.log('🔄 [OPTIMIZED INBOX] Manual refresh triggered');
    setLoading(true);
    loadConversations();
    if (onLeadsRefresh) {
      onLeadsRefresh();
    }
  }, [loadConversations, onLeadsRefresh]);

  // Initial load
  useEffect(() => {
    if (profile?.id) {
      loadConversations();
    }
  }, [profile?.id, loadConversations]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (loadConversationsDebounceRef.current) {
        clearTimeout(loadConversationsDebounceRef.current);
      }
      if (loadMessagesDebounceRef.current) {
        clearTimeout(loadMessagesDebounceRef.current);
      }
    };
  }, []);

  return {
    conversations,
    messages,
    loading,
    error,
    sendingMessage,
    totalConversations,
    loadMessages,
    sendMessage,
    manualRefresh,
    setError
  };
};
