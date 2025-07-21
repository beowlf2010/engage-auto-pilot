
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
          lead_source,
          lead_type,
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
          const primaryPhone = lead.phone_numbers?.find((phone: any) => phone.is_primary)?.number || '';
          const allPhones = lead.phone_numbers?.map((phone: any) => phone.number) || [];

          // Fetch the last message
          const { data: lastMessageData, error: lastMessageError } = await supabase
            .from('conversations')
            .select('body, sent_at, direction, read_at')
            .eq('lead_id', lead.id)
            .order('sent_at', { ascending: false })
            .limit(1)
            .single();

          if (lastMessageError && lastMessageError.code !== 'PGRST116') {
            console.error(`❌ [SMART INBOX DATA] Error fetching last message for lead ${lead.id}:`, lastMessageError);
          }

          // Fetch message counts
          const { count: totalMessageCount, error: totalCountError } = await supabase
            .from('conversations')
            .select('*', { count: 'exact' })
            .eq('lead_id', lead.id);

          if (totalCountError) {
            console.error(`❌ [SMART INBOX DATA] Error fetching total message count for lead ${lead.id}:`, totalCountError);
          }

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

          const lastMessage = lastMessageData ? {
            body: lastMessageData.body || 'No message',
            sentAt: lastMessageData.sent_at ? new Date(lastMessageData.sent_at).toISOString() : null,
            direction: lastMessageData.direction as 'in' | 'out',
            readAt: lastMessageData.read_at
          } : null;

          // Return complete ConversationListItem object
          return {
            leadId: lead.id,
            leadName: `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown Lead',
            primaryPhone: primaryPhone,
            leadPhone: primaryPhone, // Required by interface
            leadEmail: '', // Default empty, would need to fetch from separate table if needed
            lastMessage: lastMessage?.body || 'No messages yet',
            lastMessageTime: lastMessage?.sentAt || lead.updated_at,
            lastMessageDirection: lastMessage?.direction || null,
            unreadCount: unreadCount || 0,
            messageCount: totalMessageCount || 0,
            salespersonId: lead.salesperson_id || null,
            vehicleInterest: lead.vehicle_interest || 'Unknown',
            leadSource: lead.lead_source || 'Unknown',
            leadType: lead.lead_type || 'Unknown',
            status: lead.status,
            lastMessageDate: lastMessage?.sentAt ? new Date(lastMessage.sentAt) : new Date(lead.updated_at),
            salespersonName: undefined, // Could be fetched with a join if needed
            aiOptIn: undefined, // Would need to be added to leads table or fetched separately
            aiStage: undefined,
            aiMessagesSent: undefined,
            aiSequencePaused: undefined,
            messageIntensity: undefined,
            incomingCount: undefined,
            outgoingCount: undefined,
            hasUnrepliedInbound: (unreadCount || 0) > 0,
            isAiGenerated: undefined
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
