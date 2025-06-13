
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { fetchConversations } from '@/services/conversationsService';
import { fetchMessages, sendMessage as sendMessageService } from '@/services/messagesService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  const notificationPermission = useRef<NotificationPermission>('default');
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Request notification permission on mount
  useEffect(() => {
    const requestPermission = async () => {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        notificationPermission.current = permission;
      }
    };
    requestPermission();
  }, []);

  const loadConversations = async (retryCount = 0) => {
    if (!profile) return;

    try {
      setError(null);
      const conversationsData = await fetchConversations(profile);
      setConversations(conversationsData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading conversations:', error);
      
      // If it's a network error and we haven't retried too many times
      if (retryCount < 3 && error instanceof TypeError && error.message.includes('fetch')) {
        console.log(`Retrying conversation fetch (attempt ${retryCount + 1})`);
        
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, retryCount) * 1000;
        retryTimeoutRef.current = setTimeout(() => {
          loadConversations(retryCount + 1);
        }, delay);
        
        return;
      }
      
      setError('Unable to load conversations. Please check your connection.');
      setLoading(false);
    }
  };

  const loadMessages = async (leadId: string, retryCount = 0) => {
    try {
      setError(null);
      const messagesData = await fetchMessages(leadId);
      setMessages(messagesData);
      currentLeadIdRef.current = leadId;
    } catch (error) {
      console.error('Error loading messages:', error);
      
      // Retry logic for message loading
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
  };

  const sendMessage = async (leadId: string, body: string, aiGenerated = false) => {
    try {
      setError(null);
      await sendMessageService(leadId, body, profile, aiGenerated);
      
      // Refresh messages and conversations to show updated status
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
      // Refresh conversations list
      await loadConversations();

      // If viewing this lead's messages, refresh them
      if (currentLeadIdRef.current === newMessage.lead_id) {
        await loadMessages(newMessage.lead_id);
      }

      // Get lead information for notifications
      const { data: leadData } = await supabase
        .from('leads')
        .select('first_name, last_name, salesperson_id')
        .eq('id', newMessage.lead_id)
        .single();

      if (leadData && newMessage.direction === 'in') {
        const leadName = `${leadData.first_name} ${leadData.last_name}`;
        
        // Check if this message is for the current user
        const isForCurrentUser = leadData.salesperson_id === profile?.id || 
                               !leadData.salesperson_id ||
                               profile?.role === 'manager' || 
                               profile?.role === 'admin';

        if (isForCurrentUser) {
          // Show toast notification
          toast({
            title: `New message from ${leadName}`,
            description: newMessage.body.substring(0, 100) + (newMessage.body.length > 100 ? '...' : ''),
            duration: 5000,
          });

          // Show browser notification if permission granted
          if (notificationPermission.current === 'granted') {
            const notification = new Notification(`New message from ${leadName}`, {
              body: newMessage.body.substring(0, 200) + (newMessage.body.length > 200 ? '...' : ''),
              icon: '/favicon.ico',
              tag: `message-${newMessage.id}`,
            });

            notification.onclick = () => {
              window.focus();
              notification.close();
            };

            setTimeout(() => notification.close(), 5000);
          }
        }
      }
    } catch (error) {
      console.error('Error handling incoming message:', error);
    }
  };

  // Setup unified realtime channel
  useEffect(() => {
    if (!profile) return;

    // Clear any existing retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Cleanup existing channel
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

    // Load initial conversations
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
  }, [profile?.id]);

  return { 
    conversations, 
    messages, 
    loading, 
    error,
    fetchMessages: loadMessages, 
    sendMessage,
    refetch: () => loadConversations(0),
    notificationPermission: notificationPermission.current
  };
};
