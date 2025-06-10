
import { supabase } from '@/integrations/supabase/client';
import type { ConversationData } from '@/types/conversation';

export const fetchConversations = async (profile: any): Promise<ConversationData[]> => {
  if (!profile) return [];

  try {
    // Get all leads with their basic info and phone numbers
    const { data: leadsData, error: leadsError } = await supabase
      .from('leads')
      .select(`
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
      `)
      .order('created_at', { ascending: false });

    if (leadsError) throw leadsError;

    // Get latest conversation for each lead
    const { data: conversationsData, error: conversationsError } = await supabase
      .from('conversations')
      .select('*')
      .order('sent_at', { ascending: false });

    if (conversationsError) throw conversationsError;

    // Group conversations by lead
    const conversationMap = new Map();
    conversationsData?.forEach(conv => {
      const leadId = conv.lead_id;
      if (!conversationMap.has(leadId) || 
          new Date(conv.sent_at) > new Date(conversationMap.get(leadId).sent_at)) {
        conversationMap.set(leadId, conv);
      }
    });

    // Transform leads data to include conversation info
    const transformedConversations = leadsData?.map(lead => {
      const latestConv = conversationMap.get(lead.id);
      return {
        leadId: lead.id,
        leadName: `${lead.first_name} ${lead.last_name}`,
        leadPhone: lead.phone_numbers.find(p => p.is_primary)?.number || 
                  lead.phone_numbers[0]?.number || '',
        vehicleInterest: lead.vehicle_interest,
        unreadCount: latestConv && latestConv.direction === 'in' && !latestConv.read_at ? 1 : 0,
        lastMessage: latestConv?.body || 'No messages yet',
        lastMessageTime: latestConv ? new Date(latestConv.sent_at).toLocaleTimeString() : '',
        status: lead.status,
        salespersonId: lead.salesperson_id
      };
    }) || [];

    return transformedConversations;
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return [];
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
