
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
        aiGenerated: msg.ai_generated
      })) || [];

      setMessages(transformedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (leadId: string, body: string, aiGenerated = false) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .insert({
          lead_id: leadId,
          direction: 'out',
          body,
          ai_generated: aiGenerated,
          sent_at: new Date().toISOString()
        });

      if (error) throw error;

      // Refresh messages
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
