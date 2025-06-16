
import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MessageData } from '@/types/conversation';

export const useConversationData = () => {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const queryClient = useQueryClient();

  const loadMessages = useCallback(async (leadId: string) => {
    if (!leadId) return;
    
    setMessagesLoading(true);
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      const transformedMessages: MessageData[] = data.map(msg => ({
        id: msg.id,
        body: msg.body,
        direction: msg.direction as 'in' | 'out',
        sentAt: msg.sent_at,
        smsStatus: msg.sms_status || 'delivered',
        aiGenerated: msg.ai_generated || false
      }));

      setMessages(transformedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (leadId: string, messageBody: string) => {
    if (!leadId || !messageBody.trim()) {
      throw new Error('Lead ID and message body are required');
    }

    try {
      // Call the send-sms edge function
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          leadId,
          message: messageBody.trim()
        }
      });

      if (error) {
        console.error('SMS sending error:', error);
        throw new Error(error.message || 'Failed to send message');
      }

      if (!data?.success) {
        console.error('SMS sending failed:', data);
        throw new Error(data?.error || 'Failed to send message');
      }

      console.log('Message sent successfully:', data);
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['lead'] });
      
      return data;
    } catch (error) {
      console.error('Error in sendMessage:', error);
      throw error;
    }
  }, [queryClient]);

  return {
    messages,
    messagesLoading,
    loadMessages,
    sendMessage
  };
};
