
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

export const useConversations = () => {
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  const fetchConversations = async () => {
    if (!profile) return;

    try {
      // Get latest conversation for each lead
      const { data: conversationsData, error } = await supabase
        .from('conversations')
        .select(`
          *,
          leads (
            id,
            first_name,
            last_name,
            vehicle_interest,
            status,
            salesperson_id,
            phone_numbers (
              number,
              is_primary
            )
          )
        `)
        .order('sent_at', { ascending: false });

      if (error) throw error;

      // Group by lead and get latest message
      const conversationMap = new Map();
      conversationsData?.forEach(conv => {
        const leadId = conv.lead_id;
        if (!conversationMap.has(leadId) || 
            new Date(conv.sent_at) > new Date(conversationMap.get(leadId).sent_at)) {
          conversationMap.set(leadId, conv);
        }
      });

      const transformedConversations = Array.from(conversationMap.values()).map(conv => ({
        leadId: conv.lead_id,
        leadName: `${conv.leads.first_name} ${conv.leads.last_name}`,
        leadPhone: conv.leads.phone_numbers.find(p => p.is_primary)?.number || 
                  conv.leads.phone_numbers[0]?.number || '',
        vehicleInterest: conv.leads.vehicle_interest,
        unreadCount: conv.direction === 'in' && !conv.read_at ? 1 : 0,
        lastMessage: conv.body,
        lastMessageTime: new Date(conv.sent_at).toLocaleTimeString(),
        status: conv.leads.status,
        salespersonId: conv.leads.salesperson_id
      }));

      setConversations(transformedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (leadId: string) => {
    try {
      const { data: messagesData, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: true });

      if (error) throw error;

      const transformedMessages = messagesData?.map(msg => ({
        id: msg.id,
        leadId: msg.lead_id,
        direction: msg.direction,
        body: msg.body,
        sentAt: msg.sent_at,
        aiGenerated: msg.ai_generated,
        smsStatus: msg.sms_status,
        smsError: msg.sms_error
      })) || [];

      setMessages(transformedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (leadId: string, body: string, aiGenerated = false) => {
    try {
      // First, save the message to the database
      const { data: messageData, error: dbError } = await supabase
        .from('conversations')
        .insert({
          lead_id: leadId,
          direction: 'out',
          body,
          ai_generated: aiGenerated,
          sent_at: new Date().toISOString(),
          sms_status: 'pending'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Get the lead's phone number
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select(`
          phone_numbers (
            number,
            is_primary
          )
        `)
        .eq('id', leadId)
        .single();

      if (leadError) throw leadError;

      const primaryPhone = leadData.phone_numbers.find(p => p.is_primary)?.number || 
                          leadData.phone_numbers[0]?.number;

      if (!primaryPhone) {
        // Update message status to failed if no phone number
        await supabase
          .from('conversations')
          .update({ 
            sms_status: 'failed',
            sms_error: 'No phone number available'
          })
          .eq('id', messageData.id);
        
        console.error('No phone number found for lead');
        await fetchMessages(leadId);
        return;
      }

      // Send SMS via Twilio Edge Function
      try {
        const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-sms', {
          body: {
            to: primaryPhone,
            body,
            conversationId: messageData.id
          }
        });

        if (smsError) throw smsError;

        if (smsResult.success) {
          // Update message with Twilio message ID and status
          await supabase
            .from('conversations')
            .update({ 
              sms_status: smsResult.status || 'sent',
              twilio_message_id: smsResult.twilioMessageId
            })
            .eq('id', messageData.id);
        } else {
          // Update message status to failed
          await supabase
            .from('conversations')
            .update({ 
              sms_status: 'failed',
              sms_error: smsResult.error
            })
            .eq('id', messageData.id);
        }
      } catch (smsError) {
        console.error('SMS sending failed:', smsError);
        // Update message status to failed
        await supabase
          .from('conversations')
          .update({ 
            sms_status: 'failed',
            sms_error: smsError.message
          })
          .eq('id', messageData.id);
      }

      // Refresh messages to show updated status
      await fetchMessages(leadId);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchConversations();
    }
  }, [profile]);

  return { 
    conversations, 
    messages, 
    loading, 
    fetchMessages, 
    sendMessage,
    refetch: fetchConversations 
  };
};
