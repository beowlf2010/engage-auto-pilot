import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import type { ConversationListItem, MessageData } from '@/types/conversation';

export const useConversationOperations = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load conversations with React Query - FIXED VERSION
  const { 
    data: conversations = [], 
    isLoading: loading, 
    refetch: refetchConversations 
  } = useQuery({
    queryKey: ['stable-conversations', profile?.id],
    queryFn: async (): Promise<ConversationListItem[]> => {
      if (!profile?.id) return [];

      console.log('🔄 [CONVERSATION OPS] Loading conversations - FIXED VERSION');
      
      try {
        // Step 1: Get all conversations first (most permissive query)
        const { data: allConversations, error: convError } = await supabase
          .from('conversations')
          .select('*')
          .order('sent_at', { ascending: false });

        if (convError) {
          console.error('❌ [CONVERSATION OPS] Error fetching conversations:', convError);
          throw convError;
        }

        console.log('📊 [CONVERSATION OPS] Total conversations found:', allConversations?.length || 0);

        // Step 2: Get all leads separately to avoid filtering issues
        const { data: allLeads, error: leadsError } = await supabase
          .from('leads')
          .select(`
            id,
            first_name,
            last_name,
            vehicle_interest,
            status,
            salesperson_id,
            phone_numbers (
              number,
              is_primary
            ),
            profiles (
              first_name,
              last_name
            )
          `);

        if (leadsError) {
          console.error('❌ [CONVERSATION OPS] Error fetching leads:', leadsError);
          throw leadsError;
        }

        console.log('📊 [CONVERSATION OPS] Total leads found:', allLeads?.length || 0);

        // Step 3: Process conversations and group by lead
        const conversationMap = new Map<string, {
          leadData: any;
          latestConversation: any;
          unreadCount: number;
          totalMessages: number;
        }>();

        // Process each conversation
        allConversations?.forEach((conv: any) => {
          const leadId = conv.lead_id;
          if (!leadId) return;

          // Find matching lead data
          const leadData = allLeads?.find(lead => lead.id === leadId);
          if (!leadData) {
            console.warn('⚠️ [CONVERSATION OPS] No lead data found for conversation:', leadId);
            return;
          }

          // Get or create conversation group for this lead
          const existing = conversationMap.get(leadId);
          const isUnread = conv.direction === 'in' && !conv.read_at;
          
          if (!existing) {
            // First conversation for this lead
            conversationMap.set(leadId, {
              leadData,
              latestConversation: conv,
              unreadCount: isUnread ? 1 : 0,
              totalMessages: 1
            });
          } else {
            // Update existing group
            // Keep the latest conversation (conversations are ordered by sent_at desc)
            if (new Date(conv.sent_at) > new Date(existing.latestConversation.sent_at)) {
              existing.latestConversation = conv;
            }
            // Count unread messages
            if (isUnread) {
              existing.unreadCount++;
            }
            existing.totalMessages++;
          }
        });

        console.log('📊 [CONVERSATION OPS] Processed conversation groups:', conversationMap.size);

        // Step 4: Convert to ConversationListItem format
        const result: ConversationListItem[] = Array.from(conversationMap.entries()).map(([leadId, group]) => {
          const { leadData, latestConversation, unreadCount, totalMessages } = group;
          
          // Get primary phone or fallback
          const primaryPhone = leadData.phone_numbers?.find((p: any) => p.is_primary)?.number || 
                              leadData.phone_numbers?.[0]?.number || 
                              'No phone';

          const conversationItem: ConversationListItem = {
            leadId,
            leadName: `${leadData.first_name || 'Unknown'} ${leadData.last_name || 'Lead'}`.trim(),
            primaryPhone,
            leadPhone: primaryPhone,
            leadEmail: leadData.email || '',
            lastMessage: latestConversation.body || 'No message content',
            lastMessageTime: new Date(latestConversation.sent_at).toLocaleString(),
            lastMessageDirection: latestConversation.direction as 'in' | 'out',
            lastMessageDate: new Date(latestConversation.sent_at),
            unreadCount,
            messageCount: totalMessages,
            salespersonId: leadData.salesperson_id,
            vehicleInterest: leadData.vehicle_interest || 'Not specified',
            leadSource: leadData.source || '',
            leadType: leadData.lead_type_name || 'unknown',
            status: leadData.status || 'new',
            salespersonName: leadData.profiles ? 
              `${leadData.profiles.first_name} ${leadData.profiles.last_name}`.trim() : undefined,
            aiOptIn: leadData.ai_opt_in || false
          };

          return conversationItem;
        });

        // Step 5: Sort by unread first, then by last message time
        result.sort((a, b) => {
          // Prioritize unread conversations
          if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
          if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
          
          // Then sort by last message time (newest first)
          return b.lastMessageDate.getTime() - a.lastMessageDate.getTime();
        });

        console.log('✅ [CONVERSATION OPS] Final conversation list:', {
          totalConversations: result.length,
          withUnread: result.filter(c => c.unreadCount > 0).length,
          totalUnreadMessages: result.reduce((sum, c) => sum + c.unreadCount, 0)
        });

        return result;

      } catch (error) {
        console.error('❌ [CONVERSATION OPS] Error in conversation loading:', error);
        throw error;
      }
    },
    enabled: !!profile?.id,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false
  });

  // Load messages for a specific lead
  const loadMessages = useCallback(async (leadId: string) => {
    console.log('🔄 [CONVERSATION OPS] Loading messages for lead:', leadId);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: true });

      if (error) throw error;

      const messageData: MessageData[] = data?.map(conv => ({
        id: conv.id,
        leadId: conv.lead_id,
        direction: conv.direction as 'in' | 'out',
        body: conv.body || '',
        sentAt: conv.sent_at,
        aiGenerated: conv.ai_generated || false,
        smsStatus: conv.sms_status || 'sent'
      })) || [];

      setMessages(messageData);
      console.log('✅ [CONVERSATION OPS] Messages loaded:', messageData.length);
      
    } catch (error) {
      console.error('❌ [CONVERSATION OPS] Error loading messages:', error);
      setError(error instanceof Error ? error.message : 'Failed to load messages');
      throw error;
    }
  }, []);

  // Send a message
  const sendMessage = useCallback(async (leadId: string, messageContent: string) => {
    if (!profile?.id) throw new Error('Not authenticated');
    
    setSendingMessage(true);
    setError(null);
    
    try {
      console.log('📤 [CONVERSATION OPS] Sending message');
      
      const { error } = await supabase
        .from('conversations')
        .insert({
          lead_id: leadId,
          profile_id: profile.id,
          body: messageContent,
          direction: 'out',
          sent_at: new Date().toISOString(),
          ai_generated: false,
          sms_status: 'sent'
        });

      if (error) throw error;
      
      console.log('✅ [CONVERSATION OPS] Message sent successfully');
      
    } catch (error) {
      console.error('❌ [CONVERSATION OPS] Error sending message:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message');
      throw error;
    } finally {
      setSendingMessage(false);
    }
  }, [profile?.id]);

  // Manual refresh
  const manualRefresh = useCallback(() => {
    console.log('🔄 [CONVERSATION OPS] Manual refresh');
    refetchConversations();
    queryClient.invalidateQueries({ queryKey: ['stable-conversations'] });
  }, [refetchConversations, queryClient]);

  return {
    conversations,
    messages,
    loading,
    error,
    sendingMessage,
    loadConversations: refetchConversations,
    loadMessages,
    sendMessage,
    manualRefresh,
    setError
  };
};
