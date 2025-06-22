
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { optimizedConversationService, ConversationFilters } from '@/services/optimizedConversationService';
import { messageCacheService } from '@/services/messageCacheService';
import { ConversationListItem, MessageData } from '@/types/conversation';
import { errorHandlingService } from '@/services/errorHandlingService';

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
      
      const result = await optimizedConversationService.getConversations(page, 50, filters);
      
      if (append) {
        setConversations(prev => [...prev, ...result.conversations]);
      } else {
        setConversations(result.conversations);
      }
      
      setTotalConversations(result.totalCount);
      
      console.log(`✅ [OPTIMIZED INBOX] Loaded ${result.conversations.length} conversations (${result.totalCount} total)`);

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
      
      // Use the existing optimized query from the stable operations
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
      optimizedConversationService.invalidateCache();
      
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
    optimizedConversationService.invalidateCache();
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
