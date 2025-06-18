import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchLeadDetail, LeadDetailData } from '@/services/leadDetailService';
import { PhoneNumber } from '@/types/lead';

export const useLeadDetail = () => {
  const { id: leadId } = useParams<{ id: string }>();
  const [showMessageComposer, setShowMessageComposer] = useState(false);
  const queryClient = useQueryClient();

  console.log('Lead ID from params:', leadId);

  const { data: lead, isLoading, error } = useQuery({
    queryKey: ["lead", leadId],
    queryFn: async () => {
      if (!leadId) {
        console.error('No lead ID provided');
        throw new Error("No lead ID provided");
      }
      
      console.log('Fetching lead with ID:', leadId);
      return await fetchLeadDetail(leadId);
    },
    enabled: !!leadId,
  });

  // Function to refresh lead data (useful after sending messages)
  const refreshLeadData = () => {
    if (leadId) {
      queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
    }
  };

  // Transform phone numbers for PhoneNumberDisplay component (PhoneNumber interface)
  const phoneNumbers: PhoneNumber[] = lead?.phoneNumbers?.map((phone: any) => ({
    id: phone.id,
    number: phone.number,
    type: phone.type as 'cell' | 'day' | 'eve',
    priority: phone.priority || 1,
    status: phone.status as 'active' | 'failed' | 'opted_out',
    isPrimary: phone.isPrimary,
    lastAttempt: phone.lastAttempt
  })) || [];

  const primaryPhone = lead?.phoneNumbers?.find((p: any) => p.isPrimary)?.number || 
                     lead?.phoneNumbers?.[0]?.number || '';

  const transformedLead = lead ? {
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    middleName: lead.middleName,
    email: lead.email,
    emailAlt: lead.emailAlt,
    address: lead.address,
    city: lead.city,
    state: lead.state,
    postalCode: lead.postalCode,
    vehicleInterest: lead.vehicleInterest,
    vehicleYear: lead.vehicleYear,
    vehicleMake: lead.vehicleMake,
    vehicleModel: lead.vehicleModel,
    vehicleVIN: lead.vehicleVIN,
    status: lead.status as 'new' | 'engaged' | 'paused' | 'closed' | 'lost',
    source: lead.source,
    aiOptIn: lead.aiOptIn,
    aiStage: lead.aiStage,
    nextAiSendAt: lead.nextAiSendAt,
    createdAt: lead.createdAt,
    salespersonId: lead.salespersonId,
    doNotCall: lead.doNotCall,
    doNotEmail: lead.doNotEmail,
    doNotMail: lead.doNotMail,
    phoneNumbers: phoneNumbers,
    primaryPhone: primaryPhone,
    salesperson: lead.salespersonName || 'Unassigned',
    unreadCount: 0,
    contactStatus: 'no_contact' as const,
    incomingCount: 0,
    outgoingCount: 0,
    messageCount: lead.conversations.length,
    // Additional required Lead properties
    first_name: lead.firstName,
    last_name: lead.lastName,
    created_at: lead.createdAt
  } : null;

  const messageThreadLead = lead ? {
    id: lead.id.toString(),
    first_name: lead.firstName,
    last_name: lead.lastName,
    phone: primaryPhone,
    ai_stage: lead.aiStage || '',
    next_ai_send_at: lead.nextAiSendAt,
    last_reply_at: null,
    ai_opt_in: lead.aiOptIn || false
  } : null;

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
    handlePhoneSelect,
    refreshLeadData
  };
};
