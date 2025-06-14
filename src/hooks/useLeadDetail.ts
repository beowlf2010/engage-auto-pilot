
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PhoneNumber } from '@/types/lead';

export const useLeadDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [showMessageComposer, setShowMessageComposer] = useState(false);

  const { data: lead, isLoading, error } = useQuery({
    queryKey: ["lead", id],
    queryFn: async () => {
      if (!id) throw new Error("No lead ID provided");
      
      const { data, error } = await supabase
        .from("leads")
        .select(`
          *,
          phone_numbers (*)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Transform phone numbers for PhoneNumberDisplay component (PhoneNumber interface)
  const phoneNumbers: PhoneNumber[] = lead?.phone_numbers?.map((phone: any) => ({
    number: phone.number,
    type: phone.type as 'cell' | 'day' | 'eve',
    priority: phone.priority || 1,
    status: phone.status as 'active' | 'failed' | 'opted_out',
    lastAttempt: phone.last_attempt
  })) || [];

  // Transform phone numbers for LeadDetailData interface
  const leadDetailPhoneNumbers = lead?.phone_numbers?.map((phone: any) => ({
    id: phone.id,
    number: phone.number,
    type: phone.type,
    isPrimary: phone.is_primary,
    status: phone.status
  })) || [];

  // Get primary phone number
  const primaryPhone = lead?.phone_numbers?.find((p: any) => p.is_primary)?.number || 
                     lead?.phone_numbers?.[0]?.number || '';

  // Transform the database lead object to match component expectations
  const transformedLead = lead ? {
    id: lead.id,
    firstName: lead.first_name,
    lastName: lead.last_name,
    middleName: lead.middle_name,
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
    status: lead.status,
    source: lead.source,
    aiOptIn: lead.ai_opt_in || false,
    aiStage: lead.ai_stage,
    nextAiSendAt: lead.next_ai_send_at,
    createdAt: lead.created_at,
    salespersonId: lead.salesperson_id,
    doNotCall: lead.do_not_call,
    doNotEmail: lead.do_not_email,
    doNotMail: lead.do_not_mail,
    phoneNumbers: leadDetailPhoneNumbers,
    conversations: [],
    activityTimeline: []
  } : null;

  // Transform for MessageThread component
  const messageThreadLead = lead ? {
    id: lead.id.toString(),
    first_name: lead.first_name,
    last_name: lead.last_name,
    phone: primaryPhone,
    ai_stage: lead.ai_stage || '',
    next_ai_send_at: lead.next_ai_send_at,
    last_reply_at: lead.last_reply_at,
    ai_opt_in: lead.ai_opt_in || false
  } : null;

  // Phone selection handler
  const handlePhoneSelect = (phoneNumber: string) => {
    console.log('Selected phone:', phoneNumber);
  };

  return {
    lead,
    transformedLead,
    messageThreadLead,
    phoneNumbers,
    primaryPhone,
    isLoading,
    error,
    showMessageComposer,
    setShowMessageComposer,
    handlePhoneSelect
  };
};
