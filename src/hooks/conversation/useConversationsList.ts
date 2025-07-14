
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import type { ConversationListItem } from './conversationTypes';

export const useConversationsList = () => {
  const { profile, user, session } = useAuth();

  const { data: conversations = [], isLoading: conversationsLoading, refetch: refetchConversations } = useQuery({
    queryKey: ['stable-conversations', profile?.id],
    queryFn: async () => {
      const startTime = performance.now();
      console.log('🔄 [INBOX-TRACE] Starting conversations query...', {
        timestamp: new Date().toISOString(),
        profileId: profile?.id,
        memory: (performance as any).memory ? {
          used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) + 'MB',
          total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024) + 'MB'
        } : 'unavailable'
      });

      if (!profile) {
        console.log('❌ [INBOX-TRACE] No profile found, returning empty array');
        return [];
      }

      try {
        // Get conversations using prioritized function that shows inbound messages first
        const { data: conversationsData, error } = await supabase.rpc('get_inbox_conversations_prioritized');

        if (error) throw error;

        console.log('📊 [INBOX-TRACE] Raw conversations data received:', {
          count: conversationsData?.length || 0,
          firstFew: conversationsData?.slice(0, 3).map(conv => ({
            leadId: conv.lead_id,
            direction: conv.direction,
            sentAt: conv.sent_at,
            unreadCount: conv.unread_count,
            phone: `${conv.first_name} ${conv.last_name}`,
            lastMessage: conv.body?.substring(0, 50) + '...'
          })) || [],
          inboundCount: conversationsData?.filter(conv => conv.direction === 'in').length || 0,
          outboundCount: conversationsData?.filter(conv => conv.direction === 'out').length || 0,
          totalUnread: conversationsData?.reduce((sum, conv) => sum + (Number(conv.unread_count) || 0), 0) || 0
        });

        // Get unique lead IDs
        const leadIds = conversationsData?.map(conv => conv.lead_id) || [];
        console.log('📋 [INBOX-TRACE] Processing leads:', { 
          uniqueLeadIds: leadIds.length,
          leadIds: leadIds.slice(0, 5) 
        });
        
        // Get phone numbers for all leads in a separate query
        const { data: phoneData } = await supabase
          .from('phone_numbers')
          .select('lead_id, number, is_primary')
          .in('lead_id', leadIds);

        // Create a map of lead_id to phone numbers
        const phoneMap = new Map<string, { number: string; is_primary: boolean }[]>();
        phoneData?.forEach(phone => {
          if (!phoneMap.has(phone.lead_id)) {
            phoneMap.set(phone.lead_id, []);
          }
          phoneMap.get(phone.lead_id)!.push(phone);
        });

        console.log('📞 [INBOX-TRACE] Phone mapping complete:', {
          phoneRecords: phoneData?.length || 0,
          leadsWithPhones: phoneMap.size,
          phoneMapSample: Array.from(phoneMap.entries()).slice(0, 3).map(([leadId, phones]) => ({
            leadId,
            phones: phones.map(p => ({ number: p.number, isPrimary: p.is_primary }))
          }))
        });

        // Check for specific number
        const targetNumber = '+12513252469';
        const targetPhoneRecord = phoneData?.find(p => 
          p.number === targetNumber || 
          p.number.replace(/\D/g, '') === targetNumber.replace(/\D/g, '')
        );
        if (targetPhoneRecord) {
          console.log('🎯 [INBOUND-MSG] Found target number record:', {
            leadId: targetPhoneRecord.lead_id,
            number: targetPhoneRecord.number,
            isPrimary: targetPhoneRecord.is_primary,
            conversationsForLead: conversationsData?.filter(c => c.lead_id === targetPhoneRecord.lead_id).map(c => ({
              direction: c.direction,
              sentAt: c.sent_at,
              body: c.body?.substring(0, 100)
            }))
          });
        }

        // Process conversations into list format
        const conversationListMap = new Map<string, ConversationListItem>();

        conversationsData?.forEach(conv => {
          const leadId = conv.lead_id;
          
          // Get phone numbers for this lead from the phone map
          const leadPhones = phoneMap.get(leadId) || [];
          const primaryPhone = leadPhones.find(p => p.is_primary)?.number || 
                             leadPhones[0]?.number || '';

          // Special logging for inbound messages
          if (conv.direction === 'in') {
            console.log('📨 [INBOUND-MSG] Processing inbound conversation:', {
              leadId,
              phone: primaryPhone,
              name: `${conv.first_name} ${conv.last_name}`,
              lastMessage: conv.body?.substring(0, 50),
              sentAt: conv.sent_at,
              unreadCount: conv.unread_count,
              isTargetNumber: primaryPhone === targetNumber || primaryPhone.replace(/\D/g, '') === targetNumber.replace(/\D/g, '')
            });
          }

          const conversationItem: ConversationListItem = {
            leadId,
            leadName: `${conv.first_name} ${conv.last_name}`,
            primaryPhone,
            leadPhone: primaryPhone,
            leadEmail: conv.email || '',
            lastMessage: conv.body,
            lastMessageTime: new Date(conv.sent_at).toLocaleString(),
            lastMessageDirection: conv.direction as 'in' | 'out',
            lastMessageDate: new Date(conv.sent_at),
            unreadCount: Number(conv.unread_count) || 0,
            messageCount: 1,
            salespersonId: conv.salesperson_id,
            vehicleInterest: conv.vehicle_interest || '',
            leadSource: conv.source || '',
            leadType: conv.lead_type_name || 'unknown',
            status: conv.status || 'new',
            salespersonName: conv.profiles_first_name && conv.profiles_last_name ? `${conv.profiles_first_name} ${conv.profiles_last_name}` : undefined,
            aiOptIn: conv.ai_opt_in || false
          };

          conversationListMap.set(leadId, conversationItem);
        });

        const result = Array.from(conversationListMap.values());
        const endTime = performance.now();
        
        // Comprehensive final logging
        const inboundConversations = result.filter(c => c.lastMessageDirection === 'in');
        const unreadConversations = result.filter(c => c.unreadCount > 0);
        const targetConversation = result.find(c => 
          c.primaryPhone === targetNumber || 
          c.primaryPhone.replace(/\D/g, '') === targetNumber.replace(/\D/g, '')
        );

        console.log(`✅ [INBOX-TRACE] Conversations processing complete:`, {
          totalConversations: result.length,
          inboundCount: inboundConversations.length,
          unreadCount: unreadConversations.length,
          processingTime: Math.round(endTime - startTime) + 'ms',
          targetNumberFound: !!targetConversation,
          targetConversationDetails: targetConversation ? {
            leadId: targetConversation.leadId,
            name: targetConversation.leadName,
            phone: targetConversation.primaryPhone,
            lastMessage: targetConversation.lastMessage?.substring(0, 50),
            direction: targetConversation.lastMessageDirection,
            unreadCount: targetConversation.unreadCount
          } : null,
          inboundSample: inboundConversations.slice(0, 3).map(c => ({
            leadId: c.leadId,
            name: c.leadName,
            phone: c.primaryPhone,
            lastMessage: c.lastMessage?.substring(0, 30),
            unreadCount: c.unreadCount
          })),
          unreadSample: unreadConversations.slice(0, 3).map(c => ({
            leadId: c.leadId,
            name: c.leadName,
            phone: c.primaryPhone,
            unreadCount: c.unreadCount,
            direction: c.lastMessageDirection
          }))
        });
        
        return result;

      } catch (err) {
        console.error('❌ [STABLE CONV] Error loading conversations:', err);
        throw err;
      }
    },
    enabled: !!profile,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  return {
    conversations,
    conversationsLoading,
    refetchConversations
  };
};
