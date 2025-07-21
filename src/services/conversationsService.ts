
import { supabase } from '@/integrations/supabase/client';
import type { ConversationListItem, MessageData } from '@/types/conversation';

// Enhanced conversation fetching with proper unread count calculation
export const fetchConversations = async (profile: any): Promise<ConversationListItem[]> => {
  console.log('🔄 [CONVERSATIONS SERVICE] Fetching conversations for profile:', profile.id);
  
  try {
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        *,
        leads!inner(
          id,
          first_name,
          last_name,
          vehicle_interest,
          salesperson_id,
          lead_source_name,
          lead_type_name,
          status
        ),
        phone_numbers!inner(number)
      `)
      .order('sent_at', { ascending: false });

    if (error) {
      console.error('❌ [CONVERSATIONS SERVICE] Error fetching conversations:', error);
      throw error;
    }

    if (!conversations || conversations.length === 0) {
      console.log('📝 [CONVERSATIONS SERVICE] No conversations found');
      return [];
    }

    console.log('📊 [CONVERSATIONS SERVICE] Raw conversations loaded:', conversations.length);

    // Group conversations by lead_id
    const conversationsByLead = new Map<string, any[]>();
    
    conversations.forEach(conv => {
      const leadId = conv.lead_id;
      if (!conversationsByLead.has(leadId)) {
        conversationsByLead.set(leadId, []);
      }
      conversationsByLead.get(leadId)!.push(conv);
    });

    console.log('👥 [CONVERSATIONS SERVICE] Grouped by leads:', conversationsByLead.size);

    const result: ConversationListItem[] = [];

    conversationsByLead.forEach((leadConversations, leadId) => {
      const latestConversation = leadConversations[0]; // Already sorted by sent_at desc
      const lead = latestConversation.leads;
      const primaryPhone = latestConversation.phone_numbers?.number || '';

      if (!lead) {
        console.warn('⚠️ [CONVERSATIONS SERVICE] No lead data for conversation:', leadId);
        return;
      }

      // FIXED: Use explicit null checking for unread count calculation
      const unreadCount = leadConversations.filter(conv => 
        conv.direction === 'in' && conv.read_at === null
      ).length;

      console.log(`🔍 [CONVERSATIONS SERVICE] Lead ${leadId} unread calculation:`, {
        totalMessages: leadConversations.length,
        incomingMessages: leadConversations.filter(c => c.direction === 'in').length,
        unreadMessages: unreadCount,
        readAtValues: leadConversations.map(c => ({ id: c.id, direction: c.direction, read_at: c.read_at }))
      });

      const conversationItem: ConversationListItem = {
        leadId: lead.id,
        leadName: `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown',
        primaryPhone: primaryPhone,
        leadPhone: primaryPhone,
        leadEmail: '', // Not included in this query
        lastMessage: latestConversation.body || '',
        lastMessageTime: latestConversation.sent_at,
        lastMessageDirection: latestConversation.direction as 'in' | 'out',
        unreadCount: unreadCount,
        messageCount: leadConversations.length,
        salespersonId: lead.salesperson_id,
        vehicleInterest: lead.vehicle_interest || 'Not specified',
        leadSource: lead.lead_source_name || 'Unknown',
        leadType: lead.lead_type_name || 'Unknown',
        status: lead.status || 'active',
        lastMessageDate: new Date(latestConversation.sent_at),
        incomingCount: leadConversations.filter(c => c.direction === 'in').length,
        outgoingCount: leadConversations.filter(c => c.direction === 'out').length,
        hasUnrepliedInbound: unreadCount > 0
      };

      result.push(conversationItem);
    });

    // Sort by latest message time
    result.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());

    const totalUnread = result.reduce((sum, conv) => sum + conv.unreadCount, 0);
    console.log('✅ [CONVERSATIONS SERVICE] Final results:', {
      totalConversations: result.length,
      totalUnreadMessages: totalUnread,
      conversationsWithUnread: result.filter(c => c.unreadCount > 0).length
    });

    return result;

  } catch (error) {
    console.error('❌ [CONVERSATIONS SERVICE] Error in fetchConversations:', error);
    throw error;
  }
};

// FIXED: Transform raw Supabase data to MessageData interface
export const fetchMessages = async (leadId: string): Promise<MessageData[]> => {
  console.log('📬 [CONVERSATIONS SERVICE] Fetching messages for lead:', leadId);

  try {
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: true });

    if (error) {
      console.error('❌ [CONVERSATIONS SERVICE] Error fetching messages:', error);
      throw error;
    }

    if (!conversations) {
      console.log('📝 [CONVERSATIONS SERVICE] No messages found for lead:', leadId);
      return [];
    }

    // Transform raw Supabase data to MessageData interface
    const transformedMessages: MessageData[] = conversations.map(conv => ({
      id: conv.id,
      leadId: conv.lead_id,
      direction: conv.direction as 'in' | 'out',
      body: conv.body,
      sentAt: conv.sent_at,
      readAt: conv.read_at,
      aiGenerated: conv.ai_generated || false,
      smsStatus: conv.sms_status || 'unknown',
      smsError: conv.sms_error
    }));

    console.log('✅ [CONVERSATIONS SERVICE] Messages transformed:', {
      count: transformedMessages.length,
      latestMessage: transformedMessages[transformedMessages.length - 1]?.body?.substring(0, 50) + '...'
    });

    return transformedMessages;

  } catch (error) {
    console.error('❌ [CONVERSATIONS SERVICE] Error in fetchMessages:', error);
    throw error;
  }
};

// ADDED: Missing markMessagesAsRead function (renamed from markAllMessagesAsRead)
export const markMessagesAsRead = async (leadId: string): Promise<void> => {
  console.log('👁️ [CONVERSATIONS SERVICE] Marking messages as read for lead:', leadId);

  try {
    const { error } = await supabase
      .from('conversations')
      .update({ read_at: new Date().toISOString() })
      .eq('lead_id', leadId)
      .eq('direction', 'in')
      .is('read_at', null);

    if (error) {
      console.error('❌ [CONVERSATIONS SERVICE] Error marking messages as read:', error);
      throw error;
    }

    console.log('✅ [CONVERSATIONS SERVICE] Messages marked as read successfully');
  } catch (error) {
    console.error('❌ [CONVERSATIONS SERVICE] Error in markMessagesAsRead:', error);
    throw error;
  }
};

// ADDED: Alias for backward compatibility
export const markAllMessagesAsRead = markMessagesAsRead;

// ADDED: Missing assignCurrentUserToLead function
export const assignCurrentUserToLead = async (leadId: string, userId: string): Promise<boolean> => {
  console.log('🎯 [CONVERSATIONS SERVICE] Assigning lead to user:', { leadId, userId });

  try {
    const { error } = await supabase
      .from('leads')
      .update({ salesperson_id: userId })
      .eq('id', leadId);

    if (error) {
      console.error('❌ [CONVERSATIONS SERVICE] Error assigning lead:', error);
      return false;
    }

    console.log('✅ [CONVERSATIONS SERVICE] Lead assigned successfully');
    return true;
  } catch (error) {
    console.error('❌ [CONVERSATIONS SERVICE] Error in assignCurrentUserToLead:', error);
    return false;
  }
};
