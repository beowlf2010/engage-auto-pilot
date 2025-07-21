import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { fetchConversations, fetchMessages, markMessagesAsRead } from '@/services/conversationsService';
import { sendMessage as fixedSendMessage } from '@/services/fixedMessagesService';
import type { ConversationListItem, MessageData } from '@/types/conversation';

interface UseConversationOperationsProps {
  onLeadsRefresh?: () => void;
}

export const useConversationOperations = (props?: UseConversationOperationsProps) => {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const loadConversations = useCallback(async () => {
    console.log('🔄 [CONV OPS] Load conversations called', {
      profileId: profile?.id,
      authLoading,
      hasProfile: !!profile
    });

    if (authLoading) {
      console.log('⏳ [CONV OPS] Auth still loading, skipping conversation load');
      return;
    }

    if (!profile) {
      console.log('❌ [CONV OPS] No profile available for conversation loading');
      setError('Authentication required to load conversations');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('📞 [CONV OPS] Fetching conversations for profile:', profile.id);
      const data = await fetchConversations(profile);
      console.log('✅ [CONV OPS] Conversations loaded:', data.length);
      console.log('🔴 [CONV OPS] Unread conversations:', data.filter(c => c.unreadCount > 0).length);
      setConversations(data);
    } catch (err) {
      console.error('❌ [CONV OPS] Error loading conversations:', err);
      setError('Failed to load conversations');
      toast({
        title: "Error",
        description: "Failed to load conversations. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [profile, authLoading, toast]);

  const loadMessages = useCallback(async (leadId: string) => {
    console.log('📬 [CONV OPS] Loading messages for lead:', leadId);
    setLoading(true);
    setError(null);
    
    try {      
      const data = await fetchMessages(leadId);
      console.log('✅ [CONV OPS] Messages loaded:', data.length);
      setMessages(data);
      
      await markMessagesAsRead(leadId);
      
      // Refresh conversations after a short delay
      setTimeout(() => {
        loadConversations();
      }, 500);
      
    } catch (err) {
      console.error('❌ [CONV OPS] Error loading messages:', err);
      setError('Failed to load messages');
      toast({
        title: "Error",
        description: "Failed to load messages. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [loadConversations, toast]);

  const sendMessage = useCallback(async (leadId: string, messageText: string) => {
    if (!profile || !messageText.trim()) {
      console.error('❌ [CONV OPS] Missing profile or message text');
      return;
    }

    try {
      console.log('📤 [CONV OPS] Sending message to lead:', leadId);
      
      // Use the fixed send message service
      await fixedSendMessage(leadId, messageText.trim(), profile, false);
      
      console.log('✅ [CONV OPS] Message sent successfully, reloading messages...');
      
      // Immediately reload messages to show the new message
      await loadMessages(leadId);
      
      // Trigger leads refresh to update status tabs
      if (props?.onLeadsRefresh) {
        console.log('🔄 [CONV OPS] Triggering leads refresh after message send');
        props.onLeadsRefresh();
      }
      
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });
      
    } catch (err: any) {
      console.error('❌ [CONV OPS] Error sending message:', err);
      
      toast({
        title: "Error sending message",
        description: err.message || "Failed to send message. Please try again.",
        variant: "destructive"
      });
      throw err;
    }
  }, [profile, loadMessages, toast, props?.onLeadsRefresh]);

  const manualRefresh = useCallback(async () => {
    console.log('🔄 [CONV OPS] Manual refresh triggered');
    await loadConversations();
    
    // Also trigger leads refresh if available
    if (props?.onLeadsRefresh) {
      console.log('🔄 [CONV OPS] Triggering leads refresh during manual refresh');
      props.onLeadsRefresh();
    }
  }, [loadConversations, props?.onLeadsRefresh]);

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
