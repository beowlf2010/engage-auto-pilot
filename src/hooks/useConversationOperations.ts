
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { fetchConversations, fetchMessages, markMessagesAsRead } from '@/services/conversationsService';
import type { ConversationData, MessageData } from '@/types/conversation';

export const useConversationOperations = () => {
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();
  const { toast } = useToast();

  const loadConversations = useCallback(async () => {
    if (!profile) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchConversations(profile);
      setConversations(data);
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  const loadMessages = useCallback(async (leadId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📬 Loading messages for lead:', leadId);
      
      // Fetch messages
      const data = await fetchMessages(leadId);
      setMessages(data);
      
      // Mark incoming messages as read immediately when viewed
      await markMessagesAsRead(leadId);
      
      // Refresh conversations to update unread counts after a short delay
      setTimeout(() => {
        loadConversations();
      }, 500);
      
      console.log('✅ Messages loaded and marked as read for lead:', leadId);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [loadConversations]);

  const sendMessage = useCallback(async (leadId: string, messageText: string) => {
    if (!profile || !messageText.trim()) return;

    try {
      console.log('📤 Sending message to lead:', leadId);
      
      // Send via Supabase edge function
      const { data, error: sendError } = await supabase.functions.invoke('send-sms', {
        body: {
          leadId,
          message: messageText.trim(),
          userId: profile.id
        }
      });

      if (sendError) {
        console.error('Send SMS error:', sendError);
        throw new Error(sendError.message || 'Failed to send message');
      }

      console.log('📤 Message sent successfully:', data);
      
      // Reload messages to show the new message
      await loadMessages(leadId);
      
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });
    } catch (err: any) {
      console.error('Error sending message:', err);
      toast({
        title: "Error sending message",
        description: err.message || "Failed to send message. Please try again.",
        variant: "destructive"
      });
      throw err;
    }
  }, [profile, loadMessages, toast]);

  const manualRefresh = useCallback(async () => {
    console.log('🔄 Manual refresh triggered');
    await loadConversations();
  }, [loadConversations]);

  return {
    conversations,
    messages,
    loading,
    error,
    loadConversations,
    loadMessages,
    sendMessage,
    manualRefresh
  };
};
