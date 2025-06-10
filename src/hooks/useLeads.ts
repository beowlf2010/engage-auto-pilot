
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

      conversationsData?.forEach(conv => {
        const leadId = conv.lead_id;
        
        // Track latest conversation
        if (!conversationMap.has(leadId)) {
          conversationMap.set(leadId, conv);
        }

        // Count total messages
        const currentCount = messageCountMap.get(leadId) || 0;
        messageCountMap.set(leadId, currentCount + 1);

        // Count unread incoming messages
        if (conv.direction === 'in' && !conv.read_at) {
          const currentUnread = unreadCountMap.get(leadId) || 0;
          unreadCountMap.set(leadId, currentUnread + 1);
        }
      });

      // Transform data to match existing component structure
      const transformedLeads = leadsData?.map(lead => {
        const latestConv = conversationMap.get(lead.id);
        const messageCount = messageCountMap.get(lead.id) || 0;
        const unreadCount = unreadCountMap.get(lead.id) || 0;
        
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
          aiOptIn: lead.ai_opt_in,
          aiStage: lead.ai_stage,
          nextAiSendAt: lead.next_ai_send_at,
          createdAt: lead.created_at,
          lastMessage: latestConv?.body || null,
          lastMessageTime: latestConv ? new Date(latestConv.sent_at).toLocaleString() : null,
          unreadCount: unreadCount,
          messageCount: messageCount,
          hasBeenMessaged: messageCount > 0,
          doNotCall: lead.do_not_call,
          doNotEmail: lead.do_not_email,
          doNotMail: lead.do_not_mail
        };
      }) || [];

      // Sort leads: uncontacted first, then by last message time
      transformedLeads.sort((a, b) => {
        if (a.hasBeenMessaged !== b.hasBeenMessaged) {
          return a.hasBeenMessaged ? 1 : -1; // Not messaged first
        }
        if (a.hasBeenMessaged && b.hasBeenMessaged) {
          // Both messaged, sort by last message time (newest first)
          return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
        }
        // Both not messaged, sort by created date (newest first)
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
