
import { supabase } from '@/integrations/supabase/client';

export interface LeadDetailData {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email?: string;
  emailAlt?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  vehicleInterest: string;
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleVIN?: string;
  status: string;
  source: string;
  aiOptIn: boolean;
  aiStage?: string;
  nextAiSendAt?: string;
  createdAt: string;
  salespersonId?: string;
  salespersonName?: string;
  doNotCall: boolean;
  doNotEmail: boolean;
  doNotMail: boolean;
  phoneNumbers: Array<{
    id: string;
    number: string;
    type: string;
    isPrimary: boolean;
    status: string;
  }>;
  conversations: Array<{
    id: string;
    body: string;
    direction: 'in' | 'out';
    sentAt: string;
    aiGenerated: boolean;
    smsStatus?: string;
    leadId: string; // Added missing leadId property
  }>;
  activityTimeline: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    metadata?: Record<string, any>;
  }>;
}

export const fetchLeadDetail = async (leadId: string): Promise<LeadDetailData | null> => {
  try {
    // Fetch lead basic information
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select(`
        *,
        profiles (
          first_name,
          last_name
        )
      `)
      .eq('id', leadId)
      .single();

    if (leadError || !leadData) {
      console.error('Error fetching lead:', leadError);
      return null;
    }

    // Fetch phone numbers
    const { data: phoneNumbers, error: phoneError } = await supabase
      .from('phone_numbers')
      .select('*')
      .eq('lead_id', leadId)
      .order('priority');

    if (phoneError) {
      console.error('Error fetching phone numbers:', phoneError);
    }

    // Fetch conversations
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: true });

    if (conversationsError) {
      console.error('Error fetching conversations:', conversationsError);
    }

    // Create activity timeline from conversations and lead updates
    const activityTimeline: LeadDetailData['activityTimeline'] = [];
    
    // Add lead creation
    activityTimeline.push({
      id: `lead-created-${leadData.id}`,
      type: 'lead_created',
      description: 'Lead was created',
      timestamp: leadData.created_at
    });

    // Add conversations to timeline
    conversations?.forEach(conv => {
      activityTimeline.push({
        id: conv.id,
        type: conv.direction === 'in' ? 'message_received' : 'message_sent',
        description: conv.direction === 'in' 
          ? 'Customer replied' 
          : conv.ai_generated 
          ? 'AI message sent' 
          : 'Manual message sent',
        timestamp: conv.sent_at
      });
    });

    // Sort timeline by timestamp
    activityTimeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      id: leadData.id,
      firstName: leadData.first_name,
      lastName: leadData.last_name,
      middleName: leadData.middle_name,
      email: leadData.email,
      emailAlt: leadData.email_alt,
      address: leadData.address,
      city: leadData.city,
      state: leadData.state,
      postalCode: leadData.postal_code,
      vehicleInterest: leadData.vehicle_interest,
      vehicleYear: leadData.vehicle_year,
      vehicleMake: leadData.vehicle_make,
      vehicleModel: leadData.vehicle_model,
      vehicleVIN: leadData.vehicle_vin,
      status: leadData.status,
      source: leadData.source,
      aiOptIn: leadData.ai_opt_in || false,
      aiStage: leadData.ai_stage,
      nextAiSendAt: leadData.next_ai_send_at,
      createdAt: leadData.created_at,
      salespersonId: leadData.salesperson_id,
      salespersonName: leadData.profiles 
        ? `${leadData.profiles.first_name} ${leadData.profiles.last_name}`
        : undefined,
      doNotCall: leadData.do_not_call,
      doNotEmail: leadData.do_not_email,
      doNotMail: leadData.do_not_mail,
      phoneNumbers: phoneNumbers?.map(phone => ({
        id: phone.id,
        number: phone.number,
        type: phone.type,
        isPrimary: phone.is_primary,
        status: phone.status
      })) || [],
      conversations: conversations?.map(conv => ({
        id: conv.id,
        body: conv.body,
        direction: conv.direction as 'in' | 'out',
        sentAt: conv.sent_at,
        aiGenerated: conv.ai_generated || false,
        smsStatus: conv.sms_status,
        leadId: conv.lead_id // Added leadId to match MessageData interface
      })) || [],
      activityTimeline
    };
  } catch (error) {
    console.error('Error fetching lead detail:', error);
    return null;
  }
};
