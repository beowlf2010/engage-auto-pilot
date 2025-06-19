
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import type { MessageData } from './conversationTypes';

export const useMessagesOperations = () => {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const queryClient = useQueryClient();
  const { profile } = useAuth();

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
      throw err;
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
          profile_id: profile.id,
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
        await new Promise(resolve => setTimeout(resolve, 1000));
        return sendMessage(leadId, messageBody, retryCount + 1);
      }
      
      throw err;
    } finally {
      setSendingMessage(false);
    }
  }, [profile, queryClient, selectedLeadId, loadMessages, sendingMessage]);

  return {
    selectedLeadId,
    messages,
    sendingMessage,
    loadMessages,
    sendMessage
  };
};
