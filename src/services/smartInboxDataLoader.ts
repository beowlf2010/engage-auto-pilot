import { supabase } from '@/integrations/supabase/client';
import type { ConversationListItem } from '@/types/conversation';

export class SmartInboxDataLoader {
  async loadConversationsRobustly(): Promise<ConversationListItem[]> {
    console.log('📊 [SMART INBOX DATA] Loading conversations robustly...');

    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          id,
          first_name,
          last_name,
          status,
          created_at,
          updated_at,
          salesperson_id,
          vehicle_interest,
          phone_numbers (
            number,
            is_primary
          )
        `)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('❌ [SMART INBOX DATA] Error fetching leads:', error);
        throw new Error(`Failed to fetch leads: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ [SMART INBOX DATA] No leads found.');
        return [];
      }

      const conversations: ConversationListItem[] = await Promise.all(
        data.map(async (lead) => {
          const primaryPhone = lead.phone_numbers?.find((phone: any) => phone.is_primary)?.number || 'N/A';

          // Fetch the last message
          const { data: lastMessageData, error: lastMessageError } = await supabase
            .from('conversations')
            .select('body, sent_at, direction, read_at')
            .eq('lead_id', lead.id)
            .order('sent_at', { ascending: false })
            .limit(1)
            .single();

          if (lastMessageError) {
            console.error(`❌ [SMART INBOX DATA] Error fetching last message for lead ${lead.id}:`, lastMessageError);
          }

          const lastMessage = lastMessageData ? {
            body: lastMessageData.body || 'No message',
            sentAt: lastMessageData.sent_at ? new Date(lastMessageData.sent_at).toISOString() : null,
            direction: lastMessageData.direction,
            readAt: lastMessageData.read_at
          } : null;

          // Fetch unread message count
          const { count: unreadCount, error: unreadCountError } = await supabase
            .from('conversations')
            .select('*', { count: 'exact' })
            .eq('lead_id', lead.id)
            .eq('direction', 'in')
            .is('read_at', null);

          if (unreadCountError) {
            console.error(`❌ [SMART INBOX DATA] Error fetching unread count for lead ${lead.id}:`, unreadCountError);
          }

          return {
            leadId: lead.id,
            leadName: `${lead.first_name} ${lead.last_name}`,
            primaryPhone: primaryPhone,
            vehicleInterest: lead.vehicle_interest || 'Unknown',
            status: lead.status,
            lastMessageTime: lastMessage?.sentAt || lead.updated_at,
            lastMessageText: lastMessage?.body || 'No messages yet',
            unreadCount: unreadCount || 0,
            salespersonId: lead.salesperson_id || null,
            isAssigned: !!lead.salesperson_id
          };
        })
      );

      console.log(`✅ [SMART INBOX DATA] Loaded ${conversations.length} conversations.`);
      return conversations;

    } catch (error: any) {
      console.error('❌ [SMART INBOX DATA] Error in loadConversationsRobustly:', error);
      throw new Error(`Failed to load conversations: ${error.message}`);
    }
  }

  async loadInitialData(): Promise<ConversationListItem[]> {
    console.log('📊 [SMART INBOX DATA] Loading initial data...');
    return this.loadConversationsRobustly();
  }

  async loadConversationDetails(leadId: string): Promise<ConversationListItem | null> {
    console.log(`📊 [SMART INBOX DATA] Loading details for lead: ${leadId}`);
    
    try {
      const conversations = await this.loadConversationsRobustly();
      const conversation = conversations.find(c => c.leadId === leadId);
      
      if (conversation) {
        console.log(`✅ [SMART INBOX DATA] Found conversation details for lead: ${leadId}`);
        return conversation;
      } else {
        console.log(`⚠️ [SMART INBOX DATA] No conversation found for lead: ${leadId}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ [SMART INBOX DATA] Error loading conversation details:`, error);
      throw error;
    }
  }

  get statusTabs() {
    return [
      { id: 'all', label: 'All', count: 0 },
      { id: 'unread', label: 'Unread', count: 0 },
      { id: 'assigned', label: 'Assigned', count: 0 },
      { id: 'unassigned', label: 'Unassigned', count: 0 }
    ];
  }
}

export const smartInboxDataLoader = new SmartInboxDataLoader();
