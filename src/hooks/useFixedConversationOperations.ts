
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { fetchConversations, fetchMessages, markMessagesAsRead } from '@/services/conversationsService';
import { sendMessage as fixedSendMessage } from '@/services/fixedMessagesService';
import type { ConversationData, MessageData } from '@/types/conversation';

export const useFixedConversationOperations = () => {
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
      console.log('📬 [FIXED OPS] Loading messages for lead:', leadId);
      
      const data = await fetchMessages(leadId);
      setMessages(data);
      
      await markMessagesAsRead(leadId);
      
      // Refresh conversations after a short delay
      setTimeout(() => {
        loadConversations();
      }, 500);
      
      console.log('✅ [FIXED OPS] Messages loaded and marked as read for lead:', leadId);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [loadConversations]);

  const sendMessage = useCallback(async (leadId: string, messageText: string) => {
    if (!profile || !messageText.trim()) {
      console.error('❌ [FIXED OPS] Missing profile or message text');
      return;
    }

    try {
      console.log('📤 [FIXED OPS] === STARTING MESSAGE SEND ===');
      console.log('📤 [FIXED OPS] Lead ID:', leadId);
      console.log('📤 [FIXED OPS] Message:', messageText.substring(0, 50) + '...');
      console.log('📤 [FIXED OPS] Profile:', {
        id: profile.id,
        firstName: profile.first_name,
        hasProfile: !!profile
      });
      
      // Use the fixed send message service
      await fixedSendMessage(leadId, messageText.trim(), profile, false);
      
      console.log('✅ [FIXED OPS] Message sent successfully, reloading messages...');
      
      // Immediately reload messages to show the new message
      await loadMessages(leadId);
      
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });
      
      console.log('✅ [FIXED OPS] === MESSAGE SEND COMPLETE ===');
      
    } catch (err: any) {
      console.error('❌ [FIXED OPS] === MESSAGE SEND FAILED ===');
      console.error('❌ [FIXED OPS] Error details:', err);
      
      toast({
        title: "Error sending message",
        description: err.message || "Failed to send message. Please try again.",
        variant: "destructive"
      });
      throw err;
    }
  }, [profile, loadMessages, toast]);

  const manualRefresh = useCallback(async () => {
    console.log('🔄 [FIXED OPS] Manual refresh triggered');
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
