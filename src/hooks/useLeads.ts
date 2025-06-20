
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

export const useLeads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  const fetchLeads = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      // Fetch leads with phone numbers
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select(`
          *,
          phone_numbers (
            id,
            number,
            type,
            priority,
            status,
            is_primary,
            last_attempt
          ),
          profiles (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      if (leadsError) throw leadsError;

      // Fetch conversation data for all leads - include read_at field
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select('lead_id, body, sent_at, direction, read_at')
        .order('sent_at', { ascending: false });

      if (conversationsError) throw conversationsError;

      // Group conversations by lead and calculate stats
      const conversationMap = new Map();
      const messageCountMap = new Map();
      const unreadCountMap = new Map();
      const outgoingCountMap = new Map();
      const incomingCountMap = new Map();
      const lastMessageDirectionMap = new Map();
      const unrepliedCountMap = new Map();

      conversationsData?.forEach(conv => {
        const leadId = conv.lead_id;
        
        // Track latest conversation
        if (!conversationMap.has(leadId)) {
          conversationMap.set(leadId, conv);
          // Track direction of the latest message
          lastMessageDirectionMap.set(leadId, conv.direction);
        }

        // Count total messages
        const currentCount = messageCountMap.get(leadId) || 0;
        messageCountMap.set(leadId, currentCount + 1);

        // Count outgoing messages (contact attempts)
        if (conv.direction === 'out') {
          const currentOutgoing = outgoingCountMap.get(leadId) || 0;
          outgoingCountMap.set(leadId, currentOutgoing + 1);
        }

        // Count incoming messages (responses received)
        if (conv.direction === 'in') {
          const currentIncoming = incomingCountMap.get(leadId) || 0;
          incomingCountMap.set(leadId, currentIncoming + 1);

          // Count unread incoming messages
          if (!conv.read_at) {
            const currentUnread = unreadCountMap.get(leadId) || 0;
            unreadCountMap.set(leadId, currentUnread + 1);
          }
        }
      });

      // Calculate true unreplied counts for each lead
      for (const leadId of [...new Set(conversationsData?.map(c => c.lead_id) || [])]) {
        const leadConversations = conversationsData
          ?.filter(c => c.lead_id === leadId)
          .sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime());

        if (!leadConversations || leadConversations.length === 0) {
          unrepliedCountMap.set(leadId, 0);
          continue;
        }

        // Find the last incoming message
        const lastIncomingMessage = [...leadConversations]
          .reverse()
          .find(c => c.direction === 'in');

        if (!lastIncomingMessage) {
          // No incoming messages, so all outgoing messages are unreplied
          const outgoingCount = leadConversations.filter(c => c.direction === 'out').length;
          unrepliedCountMap.set(leadId, outgoingCount);
        } else {
          // Count outgoing messages sent after the last incoming message
          const lastIncomingTime = new Date(lastIncomingMessage.sent_at).getTime();
          const unrepliedCount = leadConversations.filter(c => 
            c.direction === 'out' && new Date(c.sent_at).getTime() > lastIncomingTime
          ).length;
          unrepliedCountMap.set(leadId, unrepliedCount);
        }
      }

      // Transform data to match existing component structure
      const transformedLeads = leadsData?.map(lead => {
        const latestConv = conversationMap.get(lead.id);
        const messageCount = messageCountMap.get(lead.id) || 0;
        const outgoingCount = outgoingCountMap.get(lead.id) || 0;
        const incomingCount = incomingCountMap.get(lead.id) || 0;
        const unreadCount = unreadCountMap.get(lead.id) || 0;
        const lastMessageDirection = lastMessageDirectionMap.get(lead.id) || null;
        const unrepliedCount = unrepliedCountMap.get(lead.id) || 0;
        
        // Determine contact status
        let contactStatus = 'no_contact';
        if (incomingCount > 0) {
          contactStatus = 'response_received';
        } else if (outgoingCount > 0) {
          contactStatus = 'contact_attempted';
        }
        
        return {
          id: lead.id,
          firstName: lead.first_name,
          lastName: lead.last_name,
          middleName: lead.middle_name,
          phoneNumbers: lead.phone_numbers.map(phone => ({
            number: phone.number,
            type: phone.type,
            priority: phone.priority,
            status: phone.status,
            lastAttempt: phone.last_attempt
          })),
          primaryPhone: lead.phone_numbers.find(p => p.is_primary)?.number || 
                       lead.phone_numbers[0]?.number || '',
          email: lead.email,
          emailAlt: lead.email_alt,
          address: lead.address,
          city: lead.city,
          state: lead.state,
          postalCode: lead.postal_code,
          vehicleInterest: lead.vehicle_interest,
          vehicleYear: lead.vehicle_year,
          vehicleMake: lead.vehicle_make,
          vehicleModel: lead.vehicle_model,
          vehicleVIN: lead.vehicle_vin,
          source: lead.source,
          status: lead.status,
          salesperson: lead.profiles ? `${lead.profiles.first_name} ${lead.profiles.last_name}` : 'Unassigned',
          salespersonId: lead.salesperson_id,
          aiOptIn: lead.ai_opt_in || false,
          aiContactEnabled: lead.ai_contact_enabled || false,
          aiRepliesEnabled: lead.ai_replies_enabled || false,
          aiStage: lead.ai_stage,
          nextAiSendAt: lead.next_ai_send_at,
          createdAt: lead.created_at,
          lastMessage: latestConv?.body || null,
          lastMessageTime: latestConv ? new Date(latestConv.sent_at).toLocaleString() : null,
          lastMessageDirection: lastMessageDirection,
          unreadCount: unreadCount,
          messageCount: messageCount,
          outgoingCount: outgoingCount,
          incomingCount: incomingCount,
          unrepliedCount: unrepliedCount,
          contactStatus: contactStatus,
          hasBeenMessaged: messageCount > 0,
          doNotCall: lead.do_not_call,
          doNotEmail: lead.do_not_email,
          doNotMail: lead.do_not_mail,
          // New enhanced AI tracking fields
          aiMessagesSent: lead.ai_messages_sent || 0,
          aiLastMessageStage: lead.ai_last_message_stage,
          aiSequencePaused: lead.ai_sequence_paused || false,
          aiPauseReason: lead.ai_pause_reason,
          aiResumeAt: lead.ai_resume_at,
          // Required properties for compatibility
          first_name: lead.first_name,
          last_name: lead.last_name,
          created_at: lead.created_at
        };
      }) || [];

      // Sort leads: no contact first, then contact attempted, then response received
      transformedLeads.sort((a, b) => {
        const statusOrder = { 'no_contact': 0, 'contact_attempted': 1, 'response_received': 2 };
        
        if (a.contactStatus !== b.contactStatus) {
          return statusOrder[a.contactStatus] - statusOrder[b.contactStatus];
        }
        
        if (a.contactStatus === 'response_received' && b.contactStatus === 'response_received') {
          // Both have responses, sort by last message time (newest first)
          return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
        }
        
        // Same status, sort by created date (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setLeads(transformedLeads);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchLeads();
    }
  }, [profile]);

  return { leads, loading, refetch: fetchLeads };
};
