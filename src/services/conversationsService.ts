import { supabase } from '@/integrations/supabase/client';
import type { ConversationListItem, MessageData } from '@/types/conversation';

export const fetchConversations = async (profile: any): Promise<ConversationListItem[]> => {
  console.log('🔄 [CONVERSATIONS SERVICE] Fetching conversations for profile:', profile.id);
  
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

    // Process conversations into the format expected by the UI
    const conversationMap = new Map<string, ConversationListItem>();

    leads.forEach(lead => {
      const leadConversations = conversations?.filter(conv => conv.lead_id === lead.id) || [];
      const lastMessage = leadConversations[0]; // Most recent due to ordering
      
      // Calculate unread count more carefully
      const incomingMessages = leadConversations.filter(conv => conv.direction === 'in');
      const unreadMessages = incomingMessages.filter(conv => !conv.read_at);
      const unreadCount = unreadMessages.length;

      console.log(`🔍 [CONVERSATIONS SERVICE] Lead ${lead.id} unread calculation:`, {
        totalMessages: leadConversations.length,
        incomingMessages: incomingMessages.length,
        unreadMessages: unreadMessages.length,
        readAtValues: leadConversations.slice(0, 5).map(c => ({ 
          id: c.id, 
          direction: c.direction, 
          read_at: c.read_at 
        }))
      });

      const phoneNumber = lead.phone_numbers?.[0]?.number || '';
      
      const conversationItem: ConversationListItem = {
        id: lead.id,
        leadId: lead.id,
        customerName: `${lead.first_name} ${lead.last_name}`.trim(),
        phoneNumber,
        lastMessage: lastMessage?.body || '',
        lastMessageTime: lastMessage?.sent_at || lead.created_at,
        unreadCount,
        direction: lastMessage?.direction || 'out',
        leadStatus: lead.lead_status_type_name || 'New',
        source: lead.lead_source_name || 'Unknown',
        vehicleInterest: lead.vehicle_interest || '',
        isAiGenerated: lastMessage?.ai_generated || false,
        salespersonId: lead.salesperson_id
      };

      conversationMap.set(lead.id, conversationItem);
    });

    const result = Array.from(conversationMap.values());
    
    console.log('✅ [CONVERSATIONS SERVICE] Processed conversations:', result.length);
    console.log('🔴 [CONVERSATIONS SERVICE] Total unread across all conversations:', 
      result.reduce((sum, conv) => sum + conv.unreadCount, 0)
    );

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

    return data || [];
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
