
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
      
      // First, get the lead's phone number
      const { data: phoneData, error: phoneError } = await supabase
        .from('phone_numbers')
        .select('number')
        .eq('lead_id', leadId)
        .eq('is_primary', true)
        .single();

      if (phoneError || !phoneData) {
        console.error('No phone number found for lead:', phoneError);
        throw new Error('No phone number found for this lead');
      }

      console.log('📱 Found phone number for lead:', phoneData.number);

      // Create conversation record first to get conversationId
      const { data: conversationData, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          lead_id: leadId,
          body: messageText.trim(),
          direction: 'out',
          ai_generated: false,
          sms_status: 'pending'
        })
        .select()
        .single();

      if (conversationError) {
        console.error('Failed to create conversation record:', conversationError);
        throw new Error('Failed to save message');
      }

      console.log('💾 Created conversation record:', conversationData.id);

      // Send SMS via edge function with correct parameters
      const { data, error: sendError } = await supabase.functions.invoke('send-sms', {
        body: {
          to: phoneData.number,
          body: messageText.trim(),
          conversationId: conversationData.id
        }
      });

      if (sendError) {
        console.error('Send SMS error:', sendError);
        
        // Update conversation record with error
        await supabase
          .from('conversations')
          .update({
            sms_status: 'failed',
            sms_error: sendError.message
          })
          .eq('id', conversationData.id);
        
        throw new Error(sendError.message || 'Failed to send message');
      }

      console.log('📤 Message sent successfully:', data);
      
      // Update conversation record with success status
      if (data.messageSid) {
        await supabase
          .from('conversations')
          .update({
            twilio_message_id: data.messageSid,
            sms_status: data.status || 'sent'
          })
          .eq('id', conversationData.id);
      }
      
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
