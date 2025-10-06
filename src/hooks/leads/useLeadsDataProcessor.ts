
import { Lead } from '@/types/lead';
import { LeadDataFromDB, ConversationFromDB } from './useLeadsTypes';

export const processLeadData = (
  leadsData: LeadDataFromDB[],
  conversationsData: ConversationFromDB[]
): Lead[] => {
  return leadsData?.map(leadData => {
    const leadConversations = conversationsData?.filter(conv => conv.lead_id === leadData.id) || [];
    
    const incomingCount = leadConversations.filter(conv => conv.direction === 'in').length;
    const outgoingCount = leadConversations.filter(conv => conv.direction === 'out').length;
    const unrepliedCount = leadConversations.filter(conv => 
      conv.direction === 'in' && !conv.read_at
    ).length;

    const lastMessage = leadConversations[0];
    const primaryPhone = leadData.phone_numbers?.find(p => p.is_primary)?.number || 
                       leadData.phone_numbers?.[0]?.number || '';

    // Check if name is unknown and use phone number instead
    const hasUnknownName = !leadData.first_name || 
                          !leadData.last_name || 
                          leadData.first_name.includes('Unknown') || 
                          leadData.last_name.includes('Unknown');
    
    const displayFirstName = hasUnknownName && primaryPhone ? primaryPhone : (leadData.first_name || '');
    const displayLastName = hasUnknownName && primaryPhone ? '' : (leadData.last_name || '');

    return {
      id: leadData.id,
      firstName: displayFirstName,
      lastName: displayLastName,
      middleName: leadData.middle_name,
      phoneNumbers: leadData.phone_numbers?.map(p => ({
        id: p.id,
        number: p.number,
        type: (p.type as 'cell' | 'day' | 'eve') || 'cell',
        priority: p.priority,
        status: (p.status as 'active' | 'failed' | 'opted_out') || 'active',
        isPrimary: p.is_primary
      })) || [],
      primaryPhone,
      email: leadData.email || '',
      emailAlt: leadData.email_alt,
      address: leadData.address,
      city: leadData.city,
      state: leadData.state,
      postalCode: leadData.postal_code,
      vehicleInterest: leadData.vehicle_interest || '',
      source: leadData.source || '',
      status: (leadData.status as 'new' | 'engaged' | 'paused' | 'closed' | 'lost') || 'new',
      salesperson: leadData.profiles ? 
        `${leadData.profiles.first_name} ${leadData.profiles.last_name}`.trim() : '',
      salespersonId: leadData.salesperson_id || '',
      aiOptIn: leadData.ai_opt_in || false,
      aiStage: leadData.ai_stage,
      nextAiSendAt: leadData.next_ai_send_at,
      createdAt: leadData.created_at,
      lastMessage: lastMessage?.body,
      lastMessageTime: lastMessage?.sent_at,
      lastMessageDirection: lastMessage?.direction as 'in' | 'out' | null,
      unreadCount: unrepliedCount,
      doNotCall: leadData.do_not_call || false,
      doNotEmail: leadData.do_not_email || false,
      doNotMail: leadData.do_not_mail || false,
      vehicleYear: leadData.vehicle_year ? parseInt(leadData.vehicle_year, 10) : undefined,
      vehicleMake: leadData.vehicle_make,
      vehicleModel: leadData.vehicle_model,
      vehicleVIN: leadData.vehicle_vin,
      contactStatus: 'no_contact' as 'no_contact' | 'contact_attempted' | 'response_received',
      incomingCount,
      outgoingCount,
      unrepliedCount,
      messageCount: incomingCount + outgoingCount,
      aiMessagesSent: leadData.ai_messages_sent || 0,
      aiLastMessageStage: leadData.ai_last_message_stage,
      aiSequencePaused: leadData.ai_sequence_paused || false,
      aiPauseReason: leadData.ai_pause_reason,
      aiResumeAt: leadData.ai_resume_at,
      leadStatusTypeName: leadData.lead_status_type_name,
      leadTypeName: leadData.lead_type_name,
      leadSourceName: leadData.lead_source_name,
      messageIntensity: (leadData.message_intensity as 'gentle' | 'standard' | 'aggressive') || 'gentle',
      aiStrategyBucket: leadData.ai_strategy_bucket,
      aiAggressionLevel: leadData.ai_aggression_level,
      aiStrategyLastUpdated: leadData.ai_strategy_last_updated,
      first_name: leadData.first_name || '',
      last_name: leadData.last_name || '',
      created_at: leadData.created_at,
      is_hidden: leadData.is_hidden || false
    };
  }) || [];
};
