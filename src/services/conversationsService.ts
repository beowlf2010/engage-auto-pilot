import { supabase } from '@/integrations/supabase/client';
import type { ConversationListItem } from '@/types/conversation';

export const fetchConversations = async (profile: any): Promise<ConversationListItem[]> => {
  const startTime = performance.now();
  console.log('🔄 [CONV SERVICE] Starting conversation fetch', {
    profileId: profile?.id,
    timestamp: new Date().toISOString()
  });

  if (!profile) {
    console.log('❌ [CONV SERVICE] No profile provided');
    return [];
  }

  try {
    // Step 1: Get all conversations with explicit ordering
    const { data: allConversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .order('sent_at', { ascending: false });

    if (convError) {
      console.error('❌ [CONV SERVICE] Error fetching conversations:', convError);
      throw convError;
    }

    console.log('📊 [CONV SERVICE] Raw conversations fetched:', allConversations?.length || 0);

    // Step 2: Get all leads with their associated data
    const { data: allLeads, error: leadsError } = await supabase
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
      `);

    if (leadsError) {
      console.error('❌ [CONV SERVICE] Error fetching leads:', leadsError);
      throw leadsError;
    }

    console.log('📊 [CONV SERVICE] Leads fetched:', allLeads?.length || 0);

    // Step 3: Process conversations and group by lead
    const conversationMap = new Map<string, {
      leadData: any;
      latestConversation: any;
      unreadCount: number;
      totalMessages: number;
      unreadConversations: any[];
    }>();

    // Debug: Track unread checking
    let totalUnreadFound = 0;
    let unreadCheckResults: any[] = [];

    allConversations?.forEach((conv: any) => {
      const leadId = conv.lead_id;
      if (!leadId) return;

      // Find matching lead data
      const leadData = allLeads?.find(lead => lead.id === leadId);
      if (!leadData) {
        console.warn('⚠️ [CONV SERVICE] No lead data found for conversation:', leadId);
        return;
      }

      // FIXED: More explicit unread checking with multiple methods
      const isUnread = conv.direction === 'in' && (
        conv.read_at === null || 
        conv.read_at === undefined || 
        conv.read_at === '' ||
        !conv.read_at
      );

      // Debug logging for unread detection
      if (conv.direction === 'in') {
        const debugInfo = {
          conversationId: conv.id,
          leadId: leadId,
          direction: conv.direction,
          read_at: conv.read_at,
          read_at_type: typeof conv.read_at,
          isUnread: isUnread,
          sent_at: conv.sent_at
        };
        unreadCheckResults.push(debugInfo);
        
        if (isUnread) {
          totalUnreadFound++;
          console.log('🔴 [CONV SERVICE] Found unread message:', debugInfo);
        }
      }

      // Get or create conversation group for this lead
      const existing = conversationMap.get(leadId);
      
      if (!existing) {
        // First conversation for this lead
        conversationMap.set(leadId, {
          leadData,
          latestConversation: conv,
          unreadCount: isUnread ? 1 : 0,
          totalMessages: 1,
          unreadConversations: isUnread ? [conv] : []
        });
      } else {
        // Update existing group
        // Keep the latest conversation (conversations are ordered by sent_at desc)
        if (new Date(conv.sent_at) > new Date(existing.latestConversation.sent_at)) {
          existing.latestConversation = conv;
        }
        
        // Count unread messages
        if (isUnread) {
          existing.unreadCount++;
          existing.unreadConversations.push(conv);
        }
        existing.totalMessages++;
      }
    });

    console.log('🔴 [CONV SERVICE] Unread analysis:', {
      totalIncomingMessages: unreadCheckResults.length,
      totalUnreadFound: totalUnreadFound,
      conversationGroupsWithUnread: Array.from(conversationMap.values()).filter(g => g.unreadCount > 0).length
    });

    // Log first few unread check results for debugging
    if (unreadCheckResults.length > 0) {
      console.log('🔍 [CONV SERVICE] Sample unread checks:', unreadCheckResults.slice(0, 5));
    }

    console.log('📊 [CONV SERVICE] Conversation groups created:', conversationMap.size);

    // Step 4: Convert to ConversationListItem format
    const result: ConversationListItem[] = Array.from(conversationMap.entries()).map(([leadId, group]) => {
      const { leadData, latestConversation, unreadCount, totalMessages } = group;
      
      // Get primary phone or fallback
      const primaryPhone = leadData.phone_numbers?.find((p: any) => p.is_primary)?.number || 
                          leadData.phone_numbers?.[0]?.number || 
                          'No phone';

      const conversationItem: ConversationListItem = {
        leadId,
        leadName: `${leadData.first_name || 'Unknown'} ${leadData.last_name || 'Lead'}`.trim(),
        primaryPhone,
        leadPhone: primaryPhone,
        leadEmail: leadData.email || '',
        lastMessage: latestConversation.body || 'No message content',
        lastMessageTime: new Date(latestConversation.sent_at).toLocaleString(),
        lastMessageDirection: latestConversation.direction as 'in' | 'out',
        lastMessageDate: new Date(latestConversation.sent_at),
        unreadCount,
        messageCount: totalMessages,
        salespersonId: leadData.salesperson_id,
        vehicleInterest: leadData.vehicle_interest || 'Not specified',
        leadSource: leadData.source || '',
        leadType: leadData.lead_type_name || 'unknown',
        status: leadData.status || 'new',
        salespersonName: leadData.profiles ? 
          `${leadData.profiles.first_name} ${leadData.profiles.last_name}`.trim() : undefined,
        aiOptIn: leadData.ai_opt_in || false
      };

      // Debug log conversations with unread messages
      if (unreadCount > 0) {
        console.log('🔴 [CONV SERVICE] Conversation with unread messages:', {
          leadName: conversationItem.leadName,
          leadId: conversationItem.leadId,
          unreadCount: conversationItem.unreadCount,
          lastMessage: conversationItem.lastMessage?.substring(0, 50) + '...'
        });
      }

      return conversationItem;
    });

    // Step 5: Sort by unread first, then by last message time
    result.sort((a, b) => {
      // Prioritize unread conversations
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      
      // Then sort by last message time (newest first)
      return b.lastMessageDate.getTime() - a.lastMessageDate.getTime();
    });

    const endTime = performance.now();
    
    const finalStats = {
      totalConversations: result.length,
      withUnread: result.filter(c => c.unreadCount > 0).length,
      totalUnreadMessages: result.reduce((sum, c) => sum + c.unreadCount, 0),
      processingTime: Math.round(endTime - startTime) + 'ms'
    };
    
    console.log('✅ [CONV SERVICE] Processing complete:', finalStats);
    
    // Log conversations with unread for verification
    const unreadConversations = result.filter(c => c.unreadCount > 0);
    if (unreadConversations.length > 0) {
      console.log('🔴 [CONV SERVICE] Final unread conversations:', 
        unreadConversations.map(c => ({
          leadName: c.leadName,
          unreadCount: c.unreadCount
        }))
      );
    } else {
      console.log('⚠️ [CONV SERVICE] No unread conversations found in final result!');
    }
    
    return result;

  } catch (err) {
    console.error('❌ [CONV SERVICE] Error processing conversations:', err);
    throw err;
  }
};

export const fetchMessages = async (leadId: string) => {
  console.log('📬 [CONV SERVICE] Fetching messages for lead:', leadId);
  
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('lead_id', leadId)
    .order('sent_at', { ascending: true });

  if (error) {
    console.error('❌ [CONV SERVICE] Error fetching messages:', error);
    throw error;
  }

  console.log('✅ [CONV SERVICE] Messages fetched:', data?.length || 0);
  return data || [];
};

export const markMessagesAsRead = async (leadId: string) => {
  console.log('👁️ [CONV SERVICE] Marking messages as read for lead:', leadId);
  
  const { error } = await supabase
    .from('conversations')
    .update({ read_at: new Date().toISOString() })
    .eq('lead_id', leadId)
    .eq('direction', 'in')
    .is('read_at', null);

  if (error) {
    console.error('❌ [CONV SERVICE] Error marking messages as read:', error);
    throw error;
  }

  console.log('✅ [CONV SERVICE] Messages marked as read');
};
