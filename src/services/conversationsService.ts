
import { supabase } from '@/integrations/supabase/client';
import type { ConversationListItem, MessageData } from '@/types/conversation';

export const fetchConversations = async (profile: any): Promise<ConversationListItem[]> => {
  if (!profile) return [];

  try {
    console.log('🔄 [CONVERSATIONS SERVICE] Starting conversation fetch...');

    // Get all leads with their basic info, phone numbers, and AI opt-in status
    const { data: leadsData, error: leadsError } = await supabase
      .from('leads')
      .select(`
        id,
        first_name,
        last_name,
        email,
        vehicle_interest,
        status,
        source,
        lead_type_name,
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

    // Get all conversations grouped by lead
    const { data: conversationsData, error: conversationsError } = await supabase
      .from('conversations')
      .select('*')
      .order('sent_at', { ascending: false });

    if (conversationsError) throw conversationsError;

    console.log('📊 [CONVERSATIONS SERVICE] Found', conversationsData?.length || 0, 'total conversations');

    // Group conversations by lead and calculate metrics
    const conversationMap = new Map();
    const leadIdsWithMessages = new Set();

    conversationsData?.forEach(conv => {
      const leadId = conv.lead_id;
      leadIdsWithMessages.add(leadId);
      
      if (!conversationMap.has(leadId)) {
        conversationMap.set(leadId, {
          latestConversation: conv,
          unreadCount: 0,
          totalMessages: 0,
          incomingCount: 0,
          outgoingCount: 0
        });
      }
      
      const group = conversationMap.get(leadId);
      
      // Update latest conversation
      if (new Date(conv.sent_at) > new Date(group.latestConversation.sent_at)) {
        group.latestConversation = conv;
      }
      
      // Count messages by direction
      if (conv.direction === 'in') {
        group.incomingCount++;
        // Count unread incoming messages
        if (!conv.read_at) {
          group.unreadCount++;
        }
      } else {
        group.outgoingCount++;
      }
      
      group.totalMessages++;
    });

    // Filter leads to only include those with actual conversations
    const leadsWithConversations = leadsData?.filter(lead => 
      leadIdsWithMessages.has(lead.id)
    ) || [];

    console.log('📊 [CONVERSATIONS SERVICE] Processing', leadsWithConversations.length, 'leads with conversations');

    // Transform leads data to ConversationListItem format
    const transformedConversations: ConversationListItem[] = leadsWithConversations.map(lead => {
      const group = conversationMap.get(lead.id);
      const latestConv = group.latestConversation;
      
      // Get primary phone or fallback
      const primaryPhone = lead.phone_numbers?.find(p => p.is_primary)?.number || 
                          lead.phone_numbers?.[0]?.number || 
                          'No phone';

      const conversationItem: ConversationListItem = {
        leadId: lead.id,
        leadName: `${lead.first_name || 'Unknown'} ${lead.last_name || 'Lead'}`.trim(),
        primaryPhone,
        leadPhone: primaryPhone, // Keep both for compatibility
        leadEmail: lead.email || '',
        lastMessage: latestConv.body || 'No message content',
        lastMessageTime: new Date(latestConv.sent_at).toLocaleString(),
        lastMessageDirection: latestConv.direction as 'in' | 'out',
        lastMessageDate: new Date(latestConv.sent_at),
        unreadCount: group.unreadCount,
        messageCount: group.totalMessages,
        salespersonId: lead.salesperson_id,
        vehicleInterest: lead.vehicle_interest || 'Not specified',
        leadSource: lead.source || 'Unknown',
        leadType: lead.lead_type_name || 'Unknown',
        status: lead.status || 'new',
        salespersonName: lead.profiles ? 
          `${lead.profiles.first_name} ${lead.profiles.last_name}`.trim() : undefined,
        aiOptIn: lead.ai_opt_in || false,
        incomingCount: group.incomingCount,
        outgoingCount: group.outgoingCount
      };

      return conversationItem;
    });

    // Sort by unread first, then by last message time
    transformedConversations.sort((a, b) => {
      // Prioritize unread conversations
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      
      // If both have unread messages, sort by unread count (most unread first)
      if (a.unreadCount > 0 && b.unreadCount > 0) {
        if (a.unreadCount !== b.unreadCount) {
          return b.unreadCount - a.unreadCount;
        }
      }
      
      // Then sort by last message time (newest first)
      return b.lastMessageDate.getTime() - a.lastMessageDate.getTime();
    });

    const totalUnread = transformedConversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
    
    console.log('✅ [CONVERSATIONS SERVICE] Processed conversations:', {
      totalConversations: transformedConversations.length,
      withUnread: transformedConversations.filter(c => c.unreadCount > 0).length,
      totalUnreadMessages: totalUnread
    });

    return transformedConversations;
  } catch (error) {
    console.error('❌ [CONVERSATIONS SERVICE] Error fetching conversations:', error);
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
      direction: msg.direction as 'in' | 'out',
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
    console.log('📖 Marking messages as read for lead:', leadId);
    
    const { data, error } = await supabase
      .from('conversations')
      .update({ read_at: new Date().toISOString() })
      .eq('lead_id', leadId)
      .eq('direction', 'in')
      .is('read_at', null)
      .select('id');

    if (error) {
      console.error('❌ Error marking messages as read:', error);
      throw error;
    }
    
    console.log('✅ Marked', data?.length || 0, 'messages as read');
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
};

export const markAllMessagesAsRead = async (leadId: string): Promise<void> => {
  try {
    console.log('📖 Marking ALL messages as read for lead:', leadId);
    
    const { error } = await supabase
      .from('conversations')
      .update({ read_at: new Date().toISOString() })
      .eq('lead_id', leadId)
      .is('read_at', null);

    if (error) {
      console.error('❌ Error marking all messages as read:', error);
      throw error;
    }
    
    console.log('✅ All messages marked as read for lead:', leadId);
  } catch (error) {
    console.error('Error marking all messages as read:', error);
    throw error;
  }
};
