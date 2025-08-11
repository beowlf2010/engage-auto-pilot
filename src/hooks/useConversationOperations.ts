import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { fetchConversations, fetchMessages, markMessagesAsRead } from '@/services/conversationsService';
import { sendMessage as fixedSendMessage } from '@/services/fixedMessagesService';
import type { ConversationListItem, MessageData } from '@/types/conversation';
import { useAutoMarkAsReadSetting } from '@/hooks/inbox/useAutoMarkAsReadSetting';

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
  const { enabled: autoMarkEnabled } = useAutoMarkAsReadSetting();


  const loadConversations = useCallback(async (scope?: 'my' | 'all', dateScope?: 'today' | 'all') => {
    console.log('🔄 [CONV OPS] Load conversations called', {
      profileId: profile?.id,
      authLoading,
      hasProfile: !!profile,
      scope: scope ?? 'my',
      dateScope: dateScope ?? 'all'
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
    
    const backoff = async <T,>(fn: () => Promise<T>, retries = 2) => {
      let attempt = 0;
      let lastErr: any;
      while (attempt <= retries) {
        try { return await fn(); } catch (e) {
          lastErr = e; attempt += 1;
          await new Promise(r => setTimeout(r, Math.min(1500, 300 * Math.pow(2, attempt))));
        }
      }
      throw lastErr;
    };
    
    try {
      console.log('📞 [CONV OPS] Fetching conversations for profile:', profile.id, 'scope:', scope ?? 'my', 'dateScope:', dateScope ?? 'all');
      const data = await backoff(() => fetchConversations(profile, { scope, dateScope }));
      console.log('✅ [CONV OPS] Conversations loaded:', data.length);
      console.log('🔴 [CONV OPS] Unread conversations:', data.filter(c => c.unreadCount > 0).length);
      setConversations(data);
      // Cache last successful payload
      try { localStorage.setItem('conversations:last', JSON.stringify({ at: Date.now(), data })); } catch {}
    } catch (err) {
      console.error('❌ [CONV OPS] Error loading conversations:', err);
      // Fallback to cached data if available
      try {
        const cached = localStorage.getItem('conversations:last');
        if (cached) {
          const parsed = JSON.parse(cached);
          setConversations(parsed.data || []);
          setError('Showing cached conversations due to network issues');
          toast({ title: 'Network issue', description: 'Showing cached conversations.', variant: 'default' });
        } else {
          setError('Failed to load conversations');
          toast({ title: 'Error', description: 'Failed to load conversations. Please try again.', variant: 'destructive' });
        }
      } catch {
        setError('Failed to load conversations');
        toast({ title: 'Error', description: 'Failed to load conversations. Please try again.', variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  }, [profile, authLoading, toast]);


  const loadMessages = useCallback(async (leadId: string) => {
    console.log('📬 [CONV OPS] Loading messages for lead:', leadId);

    // Optimistic: immediately zero unread count for this lead when opening, if enabled
    if (autoMarkEnabled) {
      setConversations(prev => prev.map(c => c.leadId === leadId ? { ...c, unreadCount: 0 } : c));
      // Trigger global listeners (badges, headers) to refresh
      window.dispatchEvent(new CustomEvent('unread-count-changed'));
    }

    setLoading(true);
    setError(null);

    const backoff = async <T,>(fn: () => Promise<T>, retries = 2) => {
      let attempt = 0; let lastErr: any;
      while (attempt <= retries) {
        try { return await fn(); } catch (e) { lastErr = e; attempt += 1; await new Promise(r => setTimeout(r, Math.min(1500, 300 * Math.pow(2, attempt)))); }
      }
      throw lastErr;
    };
    
    try {      
      const data = await backoff(() => fetchMessages(leadId));
      console.log('✅ [CONV OPS] Messages loaded:', data.length);
      setMessages(data);
      // Cache
      try { localStorage.setItem(`messages:${leadId}`, JSON.stringify({ at: Date.now(), data })); } catch {}
      
      if (autoMarkEnabled) {
        await markMessagesAsRead(leadId);
      }
      
      // Refresh conversations after a short delay
      setTimeout(() => {
        loadConversations();
      }, 500);
      
    } catch (err) {
      console.error('❌ [CONV OPS] Error loading messages:', err);
      // Fallback to cached messages
      try {
        const cached = localStorage.getItem(`messages:${leadId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          setMessages(parsed.data || []);
          setError('Showing cached messages due to network issues');
          toast({ title: 'Network issue', description: 'Showing cached messages.', variant: 'default' });
        } else {
          setError('Failed to load messages');
          toast({ title: 'Error', description: 'Failed to load messages. Please try again.', variant: 'destructive' });
        }
      } catch {
        setError('Failed to load messages');
        toast({ title: 'Error', description: 'Failed to load messages. Please try again.', variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  }, [loadConversations, toast, autoMarkEnabled]);

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

  const optimisticZeroUnread = useCallback((leadId: string) => {
    setConversations(prev => prev.map(c => c.leadId === leadId ? { ...c, unreadCount: 0 } : c));
    try { window.dispatchEvent(new CustomEvent('unread-count-changed')); } catch {}
  }, []);

  const manualRefresh = useCallback(async (scope?: 'my' | 'all', dateScope?: 'today' | 'all') => {
    console.log('🔄 [CONV OPS] Manual refresh triggered', { scope: scope ?? 'my', dateScope: dateScope ?? 'all' });
    await loadConversations(scope, dateScope);
    
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
    optimisticZeroUnread,
    manualRefresh
  };
};
