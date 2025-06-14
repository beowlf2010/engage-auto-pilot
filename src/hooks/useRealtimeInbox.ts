
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { fetchConversations } from '@/services/conversationsService';
import { fetchMessages, sendMessage as sendMessageService } from '@/services/messagesService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useInboxNotifications } from './useInboxNotifications';
import type { ConversationData, MessageData } from '@/types/conversation';

interface IncomingMessage {
  id: string;
  lead_id: string;
  direction: 'in' | 'out';
  body: string;
  sent_at: string;
}

export const useRealtimeInbox = () => {
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();
  const { toast } = useToast();
  const channelRef = useRef<any>(null);
  const currentLeadIdRef = useRef<string | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const failureCountRef = useRef(0);
  const maxRetries = 3;

  // Use the new email notifications hook
  useInboxNotifications();

  const loadConversations = useCallback(async (retryCount = 0) => {
    if (!profile) return;

    try {
      console.log('Loading conversations, attempt:', retryCount + 1);
      setError(null);
      const conversationsData = await fetchConversations(profile);
      setConversations(conversationsData);
      setLoading(false);
      failureCountRef.current = 0;
    } catch (error) {
      console.error('Error loading conversations:', error);
      failureCountRef.current += 1;
      
      if (retryCount >= maxRetries) {
        console.log('Max retries reached, stopping attempts');
        setError('Unable to load conversations. Please refresh the page.');
        setLoading(false);
        return;
      }
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.log(`Retrying conversation fetch (attempt ${retryCount + 1}/${maxRetries})`);
        
        const baseDelay = Math.pow(2, retryCount) * 1000;
        const jitter = Math.random() * 1000;
        const delay = baseDelay + jitter;
        
        retryTimeoutRef.current = setTimeout(() => {
          loadConversations(retryCount + 1);
        }, delay);
        
        return;
      }
      
      setError('Unable to load conversations. Please check your connection.');
      setLoading(false);
    }
  }, [profile]);

  const loadMessages = useCallback(async (leadId: string, retryCount = 0) => {
    try {
      console.log('Loading messages for lead:', leadId);
      setError(null);
      const messagesData = await fetchMessages(leadId);
      setMessages(messagesData);
      currentLeadIdRef.current = leadId;
    } catch (error) {
      console.error('Error loading messages:', error);
      
      if (retryCount < 2 && error instanceof TypeError && error.message.includes('fetch')) {
        console.log(`Retrying message fetch (attempt ${retryCount + 1})`);
        
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => {
          loadMessages(leadId, retryCount + 1);
        }, delay);
        
        return;
      }
      
      setError('Unable to load messages for this conversation.');
    }
  }, []);

  const sendMessage = async (leadId: string, body: string, aiGenerated = false) => {
    try {
      setError(null);
      await sendMessageService(leadId, body, profile, aiGenerated);
      
      await loadMessages(leadId);
      await loadConversations();
    } catch (error) {
      console.error('Error in sendMessage:', error);
      setError('Failed to send message. Please try again.');
      throw error;
    }
  };

  const handleIncomingMessage = async (payload: any) => {
    const newMessage = payload.new as IncomingMessage;
    console.log('New incoming message:', newMessage);

    try {
      await loadConversations();

      if (currentLeadIdRef.current === newMessage.lead_id) {
        await loadMessages(newMessage.lead_id);
      }

      const { data: leadData } = await supabase
        .from('leads')
        .select('first_name, last_name, salesperson_id')
        .eq('id', newMessage.lead_id)
        .single();

      if (leadData && newMessage.direction === 'in') {
        const leadName = `${leadData.first_name} ${leadData.last_name}`;
        
        const isForCurrentUser = leadData.salesperson_id === profile?.id || 
                               !leadData.salesperson_id ||
                               profile?.role === 'manager' || 
                               profile?.role === 'admin';

        if (isForCurrentUser) {
          toast({
            title: `📱 New message from ${leadName}`,
            description: newMessage.body.substring(0, 100) + (newMessage.body.length > 100 ? '...' : ''),
            duration: 5000,
          });
        }
      }
    } catch (error) {
      console.error('Error handling incoming message:', error);
    }
  };

  // Setup unified realtime channel for SMS messages
  useEffect(() => {
    if (!profile) return;

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    if (channelRef.current) {
      try {
        console.log('Removing existing unified channel');
        supabase.removeChannel(channelRef.current);
      } catch (error) {
        console.error('Error removing existing unified channel:', error);
      }
      channelRef.current = null;
    }

    const channelName = `unified-inbox-${profile.id}-${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations'
        },
        handleIncomingMessage
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations'
        },
        handleIncomingMessage
      );

    channel.subscribe((status) => {
      console.log('Unified inbox channel status:', status);
      if (status === 'SUBSCRIBED') {
        channelRef.current = channel;
        console.log('Unified inbox channel subscribed successfully');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('Unified inbox channel error');
        channelRef.current = null;
      } else if (status === 'CLOSED') {
        console.log('Unified inbox channel closed');
        channelRef.current = null;
      }
    });

    loadConversations();

    return () => {
      if (channelRef.current) {
        try {
          console.log('Cleaning up unified inbox channel');
          supabase.removeChannel(channelRef.current);
        } catch (error) {
          console.error('Error removing unified inbox channel:', error);
        }
      }
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [profile?.id, loadConversations]);

  const manualRefresh = useCallback(() => {
    failureCountRef.current = 0;
    setError(null);
    setLoading(true);
    loadConversations(0);
  }, [loadConversations]);

  return { 
    conversations, 
    messages, 
    loading, 
    error,
    fetchMessages: loadMessages, 
    sendMessage,
    refetch: manualRefresh
  };
};
