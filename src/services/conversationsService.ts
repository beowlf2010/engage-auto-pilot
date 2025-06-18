import { supabase } from '@/integrations/supabase/client';
import type { ConversationData, MessageData } from '@/types/conversation';

export const fetchConversations = async (profile: any): Promise<ConversationData[]> => {
  if (!profile) return [];

  try {
    // Get all leads with their basic info, phone numbers, and AI opt-in status
    const { data: leadsData, error: leadsError } = await supabase
      .from('leads')
      .select(`
        id,
        first_name,
        last_name,
        vehicle_interest,
        status,
        salesperson_id,
        ai_opt_in,
        phone_numbers (
          number,
          is_primary
        ),
        profiles (
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false });

    if (leadsError) throw leadsError;

    // Get latest conversation for each lead
    const { data: conversationsData, error: conversationsError } = await supabase
      .from('conversations')
      .select('*')
      .order('sent_at', { ascending: false });

    if (conversationsError) throw conversationsError;

    // Group conversations by lead and calculate unread counts
    const conversationMap = new Map();
    const unreadCountMap = new Map();
    const leadIdsWithMessages = new Set();

    conversationsData?.forEach(conv => {
      const leadId = conv.lead_id;
      leadIdsWithMessages.add(leadId);
      
      // Track latest conversation
      if (!conversationMap.has(leadId) || 
          new Date(conv.sent_at) > new Date(conversationMap.get(leadId).sent_at)) {
        conversationMap.set(leadId, conv);
      }

      // Count unread incoming messages
      if (conv.direction === 'in' && !conv.read_at) {
        const currentCount = unreadCountMap.get(leadId) || 0;
        unreadCountMap.set(leadId, currentCount + 1);
      }
    });

    // Filter leads to only include those with actual conversations
    const leadsWithConversations = leadsData?.filter(lead => 
      leadIdsWithMessages.has(lead.id)
    ) || [];

    // Transform leads data to include conversation info
    const transformedConversations = leadsWithConversations.map(lead => {
      const latestConv = conversationMap.get(lead.id);
      const unreadCount = unreadCountMap.get(lead.id) || 0;
      
      return {
        leadId: lead.id,
        leadName: `${lead.first_name} ${lead.last_name}`,
        leadPhone: lead.phone_numbers.find(p => p.is_primary)?.number || 
                  lead.phone_numbers[0]?.number || '',
        vehicleInterest: lead.vehicle_interest,
        unreadCount,
        lastMessage: latestConv?.body || 'No messages yet',
        lastMessageTime: latestConv ? new Date(latestConv.sent_at).toLocaleTimeString() : '',
        status: lead.status,
        salespersonId: lead.salesperson_id,
        salespersonName: lead.profiles ? `${lead.profiles.first_name} ${lead.profiles.last_name}` : null,
        aiOptIn: lead.ai_opt_in || false,
        lastMessageDate: latestConv ? new Date(latestConv.sent_at) : new Date(0)
      };
    });

    // Sort conversations: unread first, then by last message time
    transformedConversations.sort((a, b) => {
      // Prioritize unread messages
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      
      // Then sort by last message time (newest first)
      return b.lastMessageDate.getTime() - a.lastMessageDate.getTime();
    });

    return transformedConversations;
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }
};

export const fetchMessages = async (leadId: string): Promise<MessageData[]> => {
  try {
    const { data: messagesData, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: true });

    if (error) throw error;

    return messagesData?.map(msg => ({
      id: msg.id,
      leadId: msg.lead_id,
      body: msg.body,
      direction: msg.direction,
      sentAt: msg.sent_at,
      readAt: msg.read_at,
      smsStatus: msg.sms_status,
      twilioMessageId: msg.twilio_message_id,
      aiGenerated: msg.ai_generated
    })) || [];
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
};

export const assignCurrentUserToLead = async (leadId: string, profileId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('leads')
      .update({ salesperson_id: profileId })
      .eq('id', leadId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error assigning lead:', error);
    return false;
  }
};

export const markMessagesAsRead = async (leadId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('conversations')
      .update({ read_at: new Date().toISOString() })
      .eq('lead_id', leadId)
      .eq('direction', 'in')
      .is('read_at', null);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }
};
