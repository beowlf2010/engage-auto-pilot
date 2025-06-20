
import { LeadData, ProcessedLead, ConversationData } from './types';
import { PhoneNumber } from '@/types/lead';
import { processConversations, determineContactStatus } from './conversationProcessor';

export const transformLeadData = (
  lead: LeadData,
  conversationsData: ConversationData[] | null
): ProcessedLead => {
  const stats = processConversations(conversationsData, lead.id);
  const contactStatus = determineContactStatus(stats.outgoingCount, stats.incomingCount);
  
  console.log(`Lead ${lead.first_name} ${lead.last_name}: outgoing=${stats.outgoingCount}, incoming=${stats.incomingCount}, contactStatus=${contactStatus}`);
  
  // Transform phone numbers to match the PhoneNumber interface
  const transformedPhoneNumbers: PhoneNumber[] = lead.phone_numbers.map(phone => ({
    id: phone.id,
    number: phone.number,
    type: phone.type as 'cell' | 'day' | 'eve',
    priority: phone.priority,
    status: phone.status as 'active' | 'failed' | 'opted_out',
    isPrimary: phone.is_primary,
    lastAttempt: phone.last_attempt
  }));
  
  return {
    id: lead.id,
    firstName: lead.first_name,
    lastName: lead.last_name,
    middleName: lead.middle_name,
    phoneNumbers: transformedPhoneNumbers,
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
    lastMessage: stats.latestConversation?.body || null,
    lastMessageTime: stats.latestConversation ? new Date(stats.latestConversation.sent_at).toLocaleString() : null,
    lastMessageDirection: stats.lastMessageDirection,
    unreadCount: stats.unreadCount,
    messageCount: stats.messageCount,
    outgoingCount: stats.outgoingCount,
    incomingCount: stats.incomingCount,
    unrepliedCount: stats.unrepliedCount,
    contactStatus: contactStatus,
    hasBeenMessaged: stats.messageCount > 0,
    doNotCall: lead.do_not_call,
    doNotEmail: lead.do_not_email,
    doNotMail: lead.do_not_mail,
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
};
