
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

      // Transform data to match existing component structure
      const transformedLeads = leadsData?.map(lead => ({
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
        lastMessage: null, // TODO: Get from conversations
        unreadCount: 0, // TODO: Calculate from conversations
        doNotCall: lead.do_not_call,
        doNotEmail: lead.do_not_email,
        doNotMail: lead.do_not_mail
      })) || [];

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
