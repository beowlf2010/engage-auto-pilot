import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import type { MessageData } from '@/types/conversation';

interface ConversationListItem {
  leadId: string;
  leadName: string;
  primaryPhone: string;
  leadPhone: string;
  lastMessage: string;
  lastMessageTime: string;
  lastMessageDirection: 'in' | 'out' | null;
  unreadCount: number;
  messageCount: number;
  salespersonId: string | null;
  vehicleInterest: string;
  status: string;
  lastMessageDate: Date;
  salespersonName?: string;
  aiOptIn?: boolean;
}

export const useStableConversationOperations = () => {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const realtimeChannelRef = useRef<any>(null);

  // Stable query for conversations list
  const { data: conversations = [], isLoading: conversationsLoading, refetch: refetchConversations } = useQuery({
    queryKey: ['stable-conversations', profile?.id],
    queryFn: async () => {
      if (!profile) return [];

      try {
        console.log('🔄 [STABLE CONV] Loading conversations...');

        const { data: conversationsData, error } = await supabase
          .from('conversations')
          .select(`
            id,
            lead_id,
            body,
            direction,
            sent_at,
            read_at,
            leads!inner(
              id,
              first_name,
              last_name,
              vehicle_interest,
              salesperson_id,
              status,
              ai_opt_in,
              phone_numbers!inner(
                number,
                is_primary
              ),
              profiles(
                first_name,
                last_name
              )
            )
          `)
          .order('sent_at', { ascending: false });

        if (error) throw error;

        // Process conversations into list format
        const conversationMap = new Map<string, ConversationListItem>();

        conversationsData?.forEach(conv => {
          const leadId = conv.lead_id;
          const lead = conv.leads;
          
          if (!conversationMap.has(leadId)) {
            const primaryPhone = lead.phone_numbers?.find(p => p.is_primary)?.number || 
                               lead.phone_numbers?.[0]?.number || '';

            conversationMap.set(leadId, {
              leadId,
              leadName: `${lead.first_name} ${lead.last_name}`,
              primaryPhone,
              leadPhone: primaryPhone, // Duplicate for compatibility
              lastMessage: conv.body,
              lastMessageTime: new Date(conv.sent_at).toLocaleString(),
              lastMessageDirection: conv.direction as 'in' | 'out',
              lastMessageDate: new Date(conv.sent_at), // Add the Date object for sorting
              unreadCount: 0,
              messageCount: 0,
              salespersonId: lead.salesperson_id,
              vehicleInterest: lead.vehicle_interest || '',
              status: lead.status || 'new', // Add status field
              salespersonName: lead.profiles ? `${lead.profiles.first_name} ${lead.profiles.last_name}` : undefined,
              aiOptIn: lead.ai_opt_in || false
            });
          }

          // Count messages
          const conversation = conversationMap.get(leadId)!;
          conversation.messageCount++;

          // Count unread incoming messages
          if (conv.direction === 'in' && !conv.read_at) {
            conversation.unreadCount++;
          }
        });

        const result = Array.from(conversationMap.values());
        console.log(`✅ [STABLE CONV] Loaded ${result.length} conversations`);
        return result;

      } catch (err) {
        console.error('❌ [STABLE CONV] Error loading conversations:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        return [];
      }
    },
    enabled: !!profile,
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: 60000, // Refetch every minute as backup
  });

  // Load messages for selected lead
  const loadMessages = useCallback(async (leadId: string) => {
    if (!leadId) return;

    try {
      console.log(`📨 [STABLE CONV] Loading messages for lead: ${leadId}`);
      
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: true });

      if (error) throw error;

      const transformedMessages: MessageData[] = data.map(msg => ({
        id: msg.id,
        leadId: msg.lead_id,
        body: msg.body,
        direction: msg.direction as 'in' | 'out',
        sentAt: msg.sent_at,
        smsStatus: msg.sms_status || 'delivered',
        aiGenerated: msg.ai_generated || false
      }));

      setMessages(transformedMessages);
      setSelectedLeadId(leadId);

      // Mark incoming messages as read
      const unreadIncoming = data.filter(msg => msg.direction === 'in' && !msg.read_at);
      if (unreadIncoming.length > 0) {
        await supabase
          .from('conversations')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadIncoming.map(msg => msg.id));

        // Refresh conversations to update unread counts
        queryClient.invalidateQueries({ queryKey: ['stable-conversations'] });
      }

      console.log(`✅ [STABLE CONV] Loaded ${transformedMessages.length} messages`);

    } catch (err) {
      console.error('❌ [STABLE CONV] Error loading messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    }
  }, [queryClient]);

  // Enhanced send message with proper profile handling and retry logic
  const sendMessage = useCallback(async (leadId: string, messageBody: string, retryCount: number = 0) => {
    if (!leadId || !messageBody.trim() || !profile) {
      throw new Error('Lead ID, message body, and profile are required');
    }

    if (sendingMessage) {
      console.log('⏳ [STABLE CONV] Message already sending, ignoring duplicate request');
      return;
    }

    setSendingMessage(true);
    setError(null);

    try {
      console.log(`📤 [STABLE CONV] Sending message to lead: ${leadId} (attempt ${retryCount + 1})`);
      console.log(`👤 [STABLE CONV] Using profile: ${profile.id}`);

      // Get the phone number for this lead
      const { data: phoneData, error: phoneError } = await supabase
        .from('phone_numbers')
        .select('number')
        .eq('lead_id', leadId)
        .eq('is_primary', true)
        .maybeSingle();

      if (phoneError || !phoneData) {
        throw new Error('No primary phone number found for this lead');
      }

      // Store the conversation record with profile_id
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          lead_id: leadId,
          profile_id: profile.id, // Include profile_id
          body: messageBody.trim(),
          direction: 'out',
          ai_generated: false,
          sent_at: new Date().toISOString(),
          sms_status: 'pending'
        })
        .select()
        .single();

      if (conversationError) {
        console.error('❌ [STABLE CONV] Conversation creation error:', conversationError);
        throw conversationError;
      }

      console.log(`✅ [STABLE CONV] Created conversation record: ${conversation.id}`);

      // Send SMS
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: phoneData.number,
          body: messageBody.trim(),
          conversationId: conversation.id
        }
      });

      if (error || !data?.success) {
        // Update conversation with failure status
        await supabase
          .from('conversations')
          .update({ 
            sms_status: 'failed', 
            sms_error: data?.error || error?.message || 'Failed to send' 
          })
          .eq('id', conversation.id);
        
        throw new Error(data?.error || error?.message || 'Failed to send message');
      }

      // Update conversation with success
      await supabase
        .from('conversations')
        .update({ 
          sms_status: 'sent', 
          twilio_message_id: data?.telnyxMessageId || data?.messageSid 
        })
        .eq('id', conversation.id);

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['stable-conversations'] });
      
      // Reload messages for current lead
      if (selectedLeadId === leadId) {
        await loadMessages(leadId);
      }

      console.log('✅ [STABLE CONV] Message sent successfully');

    } catch (err) {
      console.error('❌ [STABLE CONV] Error sending message:', err);
      
      // Retry logic for network errors
      if (retryCount < 2 && (err instanceof Error && err.message.includes('network'))) {
        console.log(`🔄 [STABLE CONV] Retrying message send (attempt ${retryCount + 2})`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        return sendMessage(leadId, messageBody, retryCount + 1);
      }
      
      throw err;
    } finally {
      setSendingMessage(false);
    }
  }, [profile, queryClient, selectedLeadId, loadMessages, sendingMessage]);

  // Manual refresh function
  const manualRefresh = useCallback(async () => {
    try {
      setError(null);
      await refetchConversations();
      if (selectedLeadId) {
        await loadMessages(selectedLeadId);
      }
    } catch (err) {
      console.error('❌ [STABLE CONV] Error during manual refresh:', err);
      setError('Failed to refresh data');
    }
  }, [refetchConversations, selectedLeadId, loadMessages]);

  // Set up consolidated realtime subscription
  useEffect(() => {
    if (!profile) return;

    // Clean up existing channel
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
    }

    console.log('🔄 [STABLE CONV] Setting up realtime subscription');

    const channel = supabase
      .channel('stable-conversation-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        (payload) => {
          console.log('📨 [STABLE CONV] Realtime update:', payload.eventType);
          
          // Debounced refresh to prevent excessive updates
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['stable-conversations'] });
            
            // If viewing messages for the affected lead, reload them
            if (selectedLeadId && payload.new && typeof payload.new === 'object' && 'lead_id' in payload.new) {
              const newRecord = payload.new as { lead_id: string };
              if (newRecord.lead_id === selectedLeadId) {
                loadMessages(selectedLeadId);
              }
            }
          }, 1000);
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [profile, queryClient, selectedLeadId, loadMessages]);

  return {
    conversations,
    messages,
    loading: conversationsLoading,
    error,
    selectedLeadId,
    sendingMessage,
    loadMessages,
    sendMessage,
    manualRefresh,
    setError
  };
};
