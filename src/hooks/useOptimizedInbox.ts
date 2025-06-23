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
  userRole?: string;
  profileId?: string;
}

export const useOptimizedInbox = ({ onLeadsRefresh, userRole, profileId }: UseOptimizedInboxProps = {}) => {
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
      
      console.log('🔄 [OPTIMIZED INBOX] Loading conversations with UNREAD-FIRST strategy...');
      console.log('👤 [OPTIMIZED INBOX] User role:', userRole, 'Profile ID:', profileId);
      
      const isAdmin = userRole === 'admin' || userRole === 'manager';
      
      // STRATEGY: Load conversations in TWO phases to ensure unread messages are always visible
      // Phase 1: Load ALL conversations with unread messages first
      // Phase 2: Load remaining conversations to fill up to a reasonable limit
      
      let allConversations: ConversationListItem[] = [];
      
      // PHASE 1: Get ALL conversations with unread messages (no limit)
      console.log('📬 [PHASE 1] Loading ALL conversations with unread messages...');
      
      let unreadQuery = supabase
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
          conversations!inner (
            id,
            body,
            direction,
            sent_at,
            read_at
          )
        `)
        .not('conversations.read_at', 'is', null) // Only leads with conversations
        .eq('conversations.direction', 'in') // Only incoming messages
        .is('conversations.read_at', null); // That are unread

      // Apply admin bypass for unread query
      if (!isAdmin) {
        unreadQuery = unreadQuery.not('status', 'in', '("lost")');
        console.log('👥 [PHASE 1] Regular user - excluding lost leads from unread');
      } else {
        console.log('👑 [PHASE 1] ADMIN USER - INCLUDING ALL STATUSES for unread messages');
      }

      const { data: unreadData, error: unreadError } = await unreadQuery
        .order('created_at', { ascending: false });

      if (unreadError) throw unreadError;

      console.log(`📊 [PHASE 1] Found ${unreadData?.length || 0} leads with unread messages`);

      // PHASE 2: Get remaining conversations to fill up to a higher limit (200 total)
      const TOTAL_CONVERSATION_LIMIT = 200;
      const remainingLimit = Math.max(0, TOTAL_CONVERSATION_LIMIT - (unreadData?.length || 0));
      
      console.log(`📄 [PHASE 2] Loading up to ${remainingLimit} additional conversations...`);
      
      let remainingQuery = supabase
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
        .order('created_at', { ascending: false });

      // Exclude leads already loaded in phase 1
      if (unreadData && unreadData.length > 0) {
        const unreadLeadIds = unreadData.map(lead => lead.id);
        remainingQuery = remainingQuery.not('id', 'in', `(${unreadLeadIds.map(id => `"${id}"`).join(',')})`);
      }

      // Apply admin bypass for remaining query
      if (!isAdmin) {
        remainingQuery = remainingQuery.not('status', 'in', '("lost")');
        console.log('👥 [PHASE 2] Regular user - excluding lost leads from remaining');
      } else {
        console.log('👑 [PHASE 2] ADMIN USER - INCLUDING ALL STATUSES for remaining conversations');
      }

      const { data: remainingData, error: remainingError } = await remainingQuery
        .range(0, remainingLimit - 1);

      if (remainingError) throw remainingError;

      console.log(`📊 [PHASE 2] Found ${remainingData?.length || 0} additional conversations`);

      // COMBINE: Merge unread (priority) + remaining conversations
      const combinedData = [...(unreadData || []), ...(remainingData || [])];
      console.log(`📊 [COMBINED] Total conversations loaded: ${combinedData.length}`);

      // Transform to ConversationListItem format with proper sorting
      const transformedConversations: ConversationListItem[] = combinedData.map(lead => {
        const conversations = lead.conversations || [];
        
        // Sort conversations by sent_at to get the actual last message
        const sortedConversations = [...conversations].sort((a, b) => 
          new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
        );
        
        const lastMessage = sortedConversations[sortedConversations.length - 1];
        
        // Count unread messages correctly (incoming messages without read_at)
        const unreadMessages = conversations.filter(c => 
          c.direction === 'in' && !c.read_at
        );

        // Calculate if this conversation has unreplied inbound messages
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
          hasUnrepliedInbound
        };
        
        return result;
      });
      
      // Sort conversations: Unread first, then by last message time
      const sortedConversations = transformedConversations.sort((a, b) => {
        // Unread messages get highest priority
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
        if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
        
        // If both have unread or both don't, sort by last message time
        const aTime = a.lastMessageDate?.getTime() || 0;
        const bTime = b.lastMessageDate?.getTime() || 0;
        return bTime - aTime;
      });
      
      // Debug information for admin users
      const unreadConversations = sortedConversations.filter(c => c.unreadCount > 0);
      const lostStatusConversations = sortedConversations.filter(c => c.status === 'lost');
      const unassignedConversations = sortedConversations.filter(c => !c.salespersonId);
      
      console.log(`📊 [OPTIMIZED INBOX] Final conversation stats for ${isAdmin ? 'ADMIN' : 'USER'}:`, {
        total: sortedConversations.length,
        withUnreadMessages: unreadConversations.length,
        lostStatus: lostStatusConversations.length,
        unassigned: unassignedConversations.length,
        userRole,
        isAdmin
      });
      
      // ADMIN DEBUG: Log specific leads we're looking for
      if (isAdmin) {
        const stevenWood = sortedConversations.find(c => 
          c.leadName.toLowerCase().includes('steven') && c.leadName.toLowerCase().includes('wood')
        );
        const jacksonCaldwell = sortedConversations.find(c => 
          c.leadName.toLowerCase().includes('jackson') && c.leadName.toLowerCase().includes('caldwell')
        );
        
        if (stevenWood) {
          console.log('✅ [ADMIN DEBUG] Found Steven Wood:', {
            name: stevenWood.leadName,
            unreadCount: stevenWood.unreadCount,
            status: stevenWood.status,
            lastMessage: stevenWood.lastMessage?.substring(0, 50) + '...'
          });
        } else {
          console.log('❌ [ADMIN DEBUG] Steven Wood not found in results');
        }
        
        if (jacksonCaldwell) {
          console.log('✅ [ADMIN DEBUG] Found Jackson Caldwell:', {
            name: jacksonCaldwell.leadName,
            unreadCount: jacksonCaldwell.unreadCount,
            status: jacksonCaldwell.status,
            lastMessage: jacksonCaldwell.lastMessage?.substring(0, 50) + '...'
          });
        } else {
          console.log('❌ [ADMIN DEBUG] Jackson Caldwell not found in results');
        }

        // List all conversations with unread messages for admin
        console.log('📋 [ADMIN DEBUG] All conversations with unread messages:', 
          unreadConversations.map(c => ({
            name: c.leadName,
            unreadCount: c.unreadCount,
            status: c.status,
            assigned: !!c.salespersonId
          }))
        );
      }
      
      if (append) {
        setConversations(prev => [...prev, ...sortedConversations]);
      } else {
        setConversations(sortedConversations);
      }
      
      setTotalConversations(sortedConversations.length);
      
      console.log(`✅ [OPTIMIZED INBOX] Loaded ${sortedConversations.length} conversations for ${isAdmin ? 'ADMIN' : 'USER'} with UNREAD-FIRST strategy`);

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
  }, [userRole, profileId]);

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
    console.log('🚀 [OPTIMIZED INBOX] Initializing optimized Smart Inbox with UNREAD-FIRST strategy...');
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
