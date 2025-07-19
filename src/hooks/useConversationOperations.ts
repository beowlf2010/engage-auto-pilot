
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

  // Load conversations with React Query
  const { 
    data: conversations = [], 
    isLoading: loading, 
    refetch: refetchConversations 
  } = useQuery({
    queryKey: ['stable-conversations', profile?.id],
    queryFn: async (): Promise<ConversationListItem[]> => {
      if (!profile?.id) return [];

      console.log('🔄 [CONVERSATION OPS] Loading conversations');
      
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          lead_id,
          body,
          direction,
          sent_at,
          ai_generated,
          sms_status,
          leads!inner (
            id,
            name,
            vehicle_interest,
            status,
            phone_numbers (number)
          )
        `)
        .order('sent_at', { ascending: false });

      if (error) throw error;

      // Group by lead and get the latest message for each
      const leadMap = new Map<string, ConversationListItem>();
      
      data?.forEach((conv: any) => {
        const leadId = conv.lead_id;
        const lead = conv.leads;
        
        if (!leadMap.has(leadId) || new Date(conv.sent_at) > new Date(leadMap.get(leadId)!.lastMessageTime)) {
          leadMap.set(leadId, {
            leadId,
            leadName: lead.name || 'Unknown',
            primaryPhone: lead.phone_numbers?.[0]?.number || '',
            leadPhone: lead.phone_numbers?.[0]?.number || '',
            leadEmail: '',
            lastMessage: conv.body || '',
            lastMessageTime: conv.sent_at,
            lastMessageDirection: conv.direction as 'in' | 'out' | null,
            unreadCount: 0,
            messageCount: 1,
            salespersonId: profile.id,
            vehicleInterest: lead.vehicle_interest || 'Not specified',
            leadSource: '',
            leadType: '',
            status: lead.status || 'active',
            lastMessageDate: new Date(conv.sent_at)
          });
        }
      });

      return Array.from(leadMap.values());
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
