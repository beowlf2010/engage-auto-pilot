import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { enhancedPredictiveService } from '@/services/enhancedPredictiveService';
import { messageCacheService } from '@/services/messageCacheService';
import { ConversationListItem, MessageData } from '@/types/conversation';
import { errorHandlingService } from '@/services/errorHandlingService';

interface ConversationFilters {
  unreadOnly?: boolean;
  incomingOnly?: boolean;
  search?: string;
}

interface UseOptimizedInboxProps {
  onLeadsRefresh?: () => void;
}

export const useOptimizedInbox = ({ onLeadsRefresh }: UseOptimizedInboxProps = {}) => {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalConversations, setTotalConversations] = useState(0);
  
  const loadingRef = useRef(false);
  const loadingMessagesRef = useRef(false);

  const loadConversations = useCallback(async (
    page = 0, 
    filters: ConversationFilters = {},
    append = false
  ) => {
    if (loadingRef.current) {
      console.log('⏳ [OPTIMIZED INBOX] Already loading conversations, skipping');
      return;
    }

    try {
      loadingRef.current = true;
      if (!append) setLoading(true);
      setError(null);
      
      console.log('🔄 [OPTIMIZED INBOX] Loading conversations with optimized service...');
      
      // Load conversations from Supabase directly
      const { data, error } = await supabase
        .from('leads')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          status,
          source,
          vehicle_interest,
          created_at,
          salesperson_id,
          conversations (
            id,
            body,
            direction,
            sent_at,
            read_at
          )
        `)
        .order('created_at', { ascending: false })
        .range(page * 50, (page + 1) * 50 - 1);

      if (error) throw error;

      // Transform to ConversationListItem format with proper sorting
      const transformedConversations: ConversationListItem[] = (data || []).map(lead => {
        const conversations = lead.conversations || [];
        
        // CRITICAL FIX: Sort conversations by sent_at to get the actual last message
        const sortedConversations = [...conversations].sort((a, b) => 
          new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
        );
        
        const lastMessage = sortedConversations[sortedConversations.length - 1];
        
        // CRITICAL FIX: Count unread messages correctly (incoming messages without read_at)
        const unreadMessages = conversations.filter(c => 
          c.direction === 'in' && !c.read_at
        );

        // NEW: Calculate if this conversation has unreplied inbound messages
        // This means the last message direction is 'in' (customer sent the last message)
        const hasUnrepliedInbound = lastMessage?.direction === 'in';
        
        const result = {
          leadId: lead.id,
          leadName: `${lead.first_name} ${lead.last_name}`,
          leadPhone: lead.phone || '',
          primaryPhone: lead.phone || '',
          vehicleInterest: lead.vehicle_interest || 'Unknown',
          status: lead.status || 'active',
          salespersonId: lead.salesperson_id,
          lastMessageTime: lastMessage?.sent_at || lead.created_at,
          lastMessageDirection: lastMessage?.direction as 'in' | 'out' | null || null,
          lastMessage: lastMessage?.body || '',
          lastMessageDate: new Date(lastMessage?.sent_at || lead.created_at),
          unreadCount: unreadMessages.length,
          messageCount: conversations.length,
          hasUnrepliedInbound // NEW: Add this property
        };
        
        // Add debugging for unreplied inbound messages
        if (hasUnrepliedInbound) {
          console.log(`📬 [OPTIMIZED INBOX] Lead ${lead.first_name} ${lead.last_name} has unreplied inbound message`);
        }
        
        return result;
      });
      
      if (append) {
        setConversations(prev => [...prev, ...transformedConversations]);
      } else {
        setConversations(transformedConversations);
      }
      
      setTotalConversations(transformedConversations.length);
      
      // Add summary logging for debugging
      const unreadConversations = transformedConversations.filter(c => c.unreadCount > 0);
      const unrepliedInboundConversations = transformedConversations.filter(c => c.hasUnrepliedInbound);
      
      console.log(`✅ [OPTIMIZED INBOX] Loaded ${transformedConversations.length} conversations`);
      console.log(`📮 [OPTIMIZED INBOX] ${unreadConversations.length} conversations with unread messages`);
      console.log(`📥 [OPTIMIZED INBOX] ${unrepliedInboundConversations.length} conversations with unreplied inbound messages`);

    } catch (err) {
      console.error('❌ [OPTIMIZED INBOX] Error loading conversations:', err);
      errorHandlingService.handleError(err, {
        operation: 'loadOptimizedConversations'
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
      console.log('⏳ [OPTIMIZED INBOX] Messages already loading, skipping');
      return;
    }

    // Check cache first
    const cachedMessages = messageCacheService.getCachedMessages(leadId);
    if (cachedMessages) {
      console.log('📋 [OPTIMIZED INBOX] Using cached messages for lead:', leadId);
      setMessages(cachedMessages);
      return;
    }

    try {
      loadingMessagesRef.current = true;
      setError(null);

      console.log('📬 [OPTIMIZED INBOX] Loading messages for lead:', leadId);
      
      // Use enhanced predictive service for loading messages
      const messagesWithContext = await enhancedPredictiveService.loadMessagesFromDatabase(leadId);

      setMessages(messagesWithContext);
      messageCacheService.cacheMessages(leadId, messagesWithContext);
      console.log('✅ [OPTIMIZED INBOX] Messages loaded successfully:', messagesWithContext.length);
    } catch (err) {
      console.error('❌ [OPTIMIZED INBOX] Error loading messages:', err);
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
      console.log('⏳ [OPTIMIZED INBOX] Already sending message, ignoring');
      return;
    }

    setSendingMessage(true);
    setError(null);

    try {
      console.log('📤 [OPTIMIZED INBOX] Sending message to lead:', leadId);
      
      // Use existing send message logic but with optimized refresh
      const { error } = await supabase.from('conversations').insert({
        lead_id: leadId,
        direction: 'out',
        body: message,
        ai_generated: false
      });

      if (error) {
        throw error;
      }

      // Invalidate relevant caches
      messageCacheService.invalidateLeadCache(leadId);
      
      // Reload messages and conversations
      await Promise.all([
        loadMessages(leadId),
        loadConversations(0, {}, false)
      ]);
      
      if (onLeadsRefresh) {
        onLeadsRefresh();
      }
      
      console.log('✅ [OPTIMIZED INBOX] Message sent successfully');
    } catch (err) {
      console.error('❌ [OPTIMIZED INBOX] Error sending message:', err);
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
  }, [loadMessages, loadConversations, onLeadsRefresh, sendingMessage]);

  const manualRefresh = useCallback(() => {
    console.log('🔄 [OPTIMIZED INBOX] Manual refresh triggered');
    messageCacheService.clearAll();
    loadConversations(0, {}, false);
  }, [loadConversations]);

  // Initialize conversations on mount
  useEffect(() => {
    console.log('🚀 [OPTIMIZED INBOX] Initializing optimized Smart Inbox...');
    loadConversations(0, {}, false);
  }, [loadConversations]);

  return {
    conversations,
    messages,
    loading,
    error,
    sendingMessage,
    totalConversations,
    loadConversations,
    loadMessages,
    sendMessage,
    manualRefresh,
    setError
  };
};
