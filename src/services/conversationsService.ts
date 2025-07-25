import { supabase } from '@/integrations/supabase/client';
import type { ConversationListItem, MessageData } from '@/types/conversation';

export const fetchConversations = async (profile: any): Promise<ConversationListItem[]> => {
  console.log('🔄 [CONVERSATIONS SERVICE] Starting fetchConversations for profile:', profile.id);
  
  try {
    // Get user roles to determine filtering
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', profile.id);

    if (rolesError) {
      console.warn('⚠️ [CONVERSATIONS SERVICE] Could not fetch user roles, defaulting to assigned leads only:', rolesError);
    }

    const roles = userRoles?.map(r => r.role) || [];
    const isAdminOrManager = roles.some(role => ['admin', 'manager'].includes(role));
    
    console.log('🔍 [CONVERSATIONS SERVICE] User roles:', roles, 'isAdminOrManager:', isAdminOrManager);

    // Build the leads query based on user role
    let leadsQuery = supabase
      .from('leads')
      .select(`
        id,
        first_name,
        last_name,
        email,
        created_at,
        lead_status_type_name,
        lead_source_name,
        vehicle_interest,
        salesperson_id,
        phone_numbers:phone_numbers(number)
      `)
      .order('created_at', { ascending: false });

    // If not admin/manager, only show assigned leads
    if (!isAdminOrManager) {
      console.log('🔍 [CONVERSATIONS SERVICE] Filtering to assigned leads only');
      leadsQuery = leadsQuery.eq('salesperson_id', profile.id);
    } else {
      console.log('🔍 [CONVERSATIONS SERVICE] Admin/Manager - showing all leads including unassigned');
    }

    const { data: leads, error: leadsError } = await leadsQuery;

    if (leadsError) {
      console.error('❌ [CONVERSATIONS SERVICE] Error fetching leads:', leadsError);
      throw leadsError;
    }

    if (!leads || leads.length === 0) {
      console.log('📭 [CONVERSATIONS SERVICE] No leads found for user');
      return [];
    }

    console.log('📋 [CONVERSATIONS SERVICE] Found leads:', leads.length);
    console.log('🔍 [CONVERSATIONS SERVICE] Lead breakdown:', {
      total: leads.length,
      assigned: leads.filter(l => l.salesperson_id).length,
      unassigned: leads.filter(l => !l.salesperson_id).length,
      withNames: leads.filter(l => l.first_name && l.last_name).length,
      sampleLeads: leads.slice(0, 3).map(l => ({
        id: l.id,
        name: `${l.first_name} ${l.last_name}`,
        salesperson_id: l.salesperson_id,
        hasPhone: l.phone_numbers?.length > 0
      }))
    });

    // Get conversations for these leads
    const leadIds = leads.map(lead => lead.id);
    
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select(`
        id,
        lead_id,
        body,
        direction,
        sent_at,
        read_at,
        ai_generated
      `)
      .in('lead_id', leadIds)
      .order('sent_at', { ascending: false });

    if (conversationsError) {
      console.error('❌ [CONVERSATIONS SERVICE] Error fetching conversations:', conversationsError);
      throw conversationsError;
    }

    console.log('💬 [CONVERSATIONS SERVICE] Found conversations:', conversations?.length || 0);
    console.log('🔍 [CONVERSATIONS SERVICE] Conversation breakdown:', {
      total: conversations?.length || 0,
      incoming: conversations?.filter(c => c.direction === 'in').length || 0,
      outgoing: conversations?.filter(c => c.direction === 'out').length || 0,
      unread: conversations?.filter(c => c.direction === 'in' && !c.read_at).length || 0
    });

    // Process conversations into the format expected by the UI
    const conversationMap = new Map<string, ConversationListItem>();

    leads.forEach(lead => {
      const leadConversations = conversations?.filter(conv => conv.lead_id === lead.id) || [];
      const lastMessage = leadConversations[0]; // Most recent due to ordering
      
      // Calculate unread count more carefully
      const incomingMessages = leadConversations.filter(conv => conv.direction === 'in');
      const unreadMessages = incomingMessages.filter(conv => !conv.read_at);
      const unreadCount = unreadMessages.length;

      console.log(`🔍 [CONVERSATIONS SERVICE] Lead ${lead.id} (${lead.first_name} ${lead.last_name}) processing:`, {
        totalMessages: leadConversations.length,
        incomingMessages: incomingMessages.length,
        unreadMessages: unreadMessages.length,
        unreadCount,
        salespersonId: lead.salesperson_id,
        hasLastMessage: !!lastMessage
      });

      const phoneNumber = lead.phone_numbers?.[0]?.number || '';
      
      const conversationItem: ConversationListItem = {
        leadId: lead.id,
        leadName: `${lead.first_name} ${lead.last_name}`.trim(),
        primaryPhone: phoneNumber,
        leadPhone: phoneNumber,
        leadEmail: lead.email || '',
        lastMessage: lastMessage?.body || '',
        lastMessageTime: lastMessage?.sent_at || lead.created_at,
        lastMessageDirection: lastMessage?.direction as 'in' | 'out' || 'out',
        unreadCount,
        messageCount: leadConversations.length,
        salespersonId: lead.salesperson_id,
        vehicleInterest: lead.vehicle_interest || '',
        leadSource: lead.lead_source_name || 'Unknown',
        leadType: 'Unknown',
        status: lead.lead_status_type_name || 'New',
        lastMessageDate: new Date(lastMessage?.sent_at || lead.created_at),
        isAiGenerated: lastMessage?.ai_generated || false
      };

      // Only add to map if lead has conversations OR unread messages OR is part of conversations
      if (leadConversations.length > 0 || unreadCount > 0) {
        conversationMap.set(lead.id, conversationItem);
        console.log(`✅ [CONVERSATIONS SERVICE] Added conversation for lead ${lead.id} with ${unreadCount} unread`);
      } else {
        console.log(`⏭️ [CONVERSATIONS SERVICE] Skipped lead ${lead.id} (no conversations)`);
      }
    });

    const result = Array.from(conversationMap.values());
    
    console.log('✅ [CONVERSATIONS SERVICE] Final processing results:', {
      totalConversations: result.length,
      totalUnreadMessages: result.reduce((sum, conv) => sum + conv.unreadCount, 0),
      conversationsWithUnread: result.filter(c => c.unreadCount > 0).length,
      sampleConversations: result.slice(0, 3).map(c => ({
        leadId: c.leadId,
        leadName: c.leadName,
        unreadCount: c.unreadCount,
        messageCount: c.messageCount,
        salespersonId: c.salespersonId
      }))
    });

    // Sort by unread first, then by last message time
    result.sort((a, b) => {
      // Prioritize conversations with unread messages
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      
      // Then sort by last message time (newest first)
      return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
    });

    console.log('🎯 [CONVERSATIONS SERVICE] After sorting:', {
      firstFewConversations: result.slice(0, 5).map(c => ({
        leadName: c.leadName,
        unreadCount: c.unreadCount,
        lastMessageTime: c.lastMessageTime
      }))
    });

    return result;
    
  } catch (error) {
    console.error('❌ [CONVERSATIONS SERVICE] Unexpected error:', error);
    throw error;
  }
};

export const fetchMessages = async (leadId: string): Promise<MessageData[]> => {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }

    return (data || []).map(msg => ({
      id: msg.id,
      leadId: msg.lead_id,
      direction: msg.direction as 'in' | 'out',
      body: msg.body,
      sentAt: msg.sent_at,
      readAt: msg.read_at,
      aiGenerated: msg.ai_generated,
      smsStatus: msg.sms_status || 'delivered',
      smsError: msg.sms_error
    }));
  } catch (error) {
    console.error('Error in fetchMessages:', error);
    return [];
  }
};

export const markMessagesAsRead = async (leadId: string) => {
  try {
    const { error } = await supabase
      .from('conversations')
      .update({ read_at: new Date().toISOString() })
      .eq('lead_id', leadId)
      .eq('direction', 'in')
      .is('read_at', null);

    if (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
    
    // Trigger global unread count refresh
    window.dispatchEvent(new CustomEvent('unread-count-changed'));

  } catch (error) {
    console.error('Error in markMessagesAsRead:', error);
  }
};
