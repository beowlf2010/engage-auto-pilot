
import { LeadData, ConversationData } from './types';
import { Lead } from '@/types/lead';
import { getPhoneNumbers, getPrimaryPhone } from '@/utils/phoneUtils';

export const transformLeadData = (leadData: LeadData, conversationsData: ConversationData[]): Lead => {
  // Create phone numbers from the phone_numbers relationship
  const phoneNumbers = getPhoneNumbers(leadData.phone_numbers || []);
  const primaryPhone = getPrimaryPhone(phoneNumbers);

  // Filter conversations for this lead
  const leadConversations = conversationsData.filter(conv => conv.lead_id === leadData.id);
  
  // Calculate message counts
  const incomingCount = leadConversations.filter(msg => msg.direction === 'in').length;
  const outgoingCount = leadConversations.filter(msg => msg.direction === 'out').length;
  
  // Calculate unreplied count - incoming messages that don't have an outgoing response after them
  let unrepliedCount = 0;
  const sortedConversations = leadConversations.sort((a, b) => 
    new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
  );
  
  for (let i = 0; i < sortedConversations.length; i++) {
    const msg = sortedConversations[i];
    if (msg.direction === 'in') {
      // Check if there's an outgoing message after this incoming message
      const hasReply = sortedConversations.slice(i + 1).some(laterMsg => 
        laterMsg.direction === 'out'
      );
      if (!hasReply) {
        unrepliedCount++;
      }
    }
  }

  // Get the most recent message
  const lastMessage = leadConversations.sort((a, b) => 
    new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
  )[0];

  // Count unread messages (where read_at is null and direction is 'in')
  const unreadCount = leadConversations.filter(msg => 
    msg.direction === 'in' && !msg.read_at
  ).length;

  // Determine contact status
  let contactStatus: 'no_contact' | 'contact_attempted' | 'response_received' = 'no_contact';
  if (incomingCount > 0) {
    contactStatus = 'response_received';
  } else if (outgoingCount > 0) {
    contactStatus = 'contact_attempted';
  }

  // Get salesperson info
  const salesperson = leadData.profiles ? 
    `${leadData.profiles.first_name || ''} ${leadData.profiles.last_name || ''}`.trim() : 
    'Unassigned';

  return {
    id: leadData.id,
    firstName: leadData.first_name || '',
    lastName: leadData.last_name || '',
    middleName: leadData.middle_name || '',
    phoneNumbers,
    primaryPhone: primaryPhone || '',
    email: leadData.email || '',
    emailAlt: leadData.email_alt || '',
    address: leadData.address || '',
    city: leadData.city || '',
    state: leadData.state || '',
    postalCode: leadData.postal_code || '',
    vehicleInterest: leadData.vehicle_interest || '',
    source: leadData.source || '',
    status: (leadData.status as Lead['status']) || 'new',
    salesperson,
    salespersonId: leadData.salesperson_id || '',
    aiOptIn: leadData.ai_opt_in || false,
    aiContactEnabled: leadData.ai_contact_enabled || false,
    aiRepliesEnabled: leadData.ai_replies_enabled || false,
    aiStage: leadData.ai_stage || undefined,
    nextAiSendAt: leadData.next_ai_send_at || undefined,
    createdAt: leadData.created_at,
    lastMessage: lastMessage?.body || undefined,
    lastMessageTime: lastMessage ? new Date(lastMessage.sent_at).toLocaleString() : undefined,
    lastMessageDirection: lastMessage?.direction as 'in' | 'out' | null || null,
    unreadCount,
    doNotCall: leadData.do_not_call || false,
    doNotEmail: leadData.do_not_email || false,
    doNotMail: leadData.do_not_mail || false,
    vehicleYear: leadData.vehicle_year || undefined,
    vehicleMake: leadData.vehicle_make || '',
    vehicleModel: leadData.vehicle_model || '',
    vehicleVIN: leadData.vehicle_vin || '',
    contactStatus,
    incomingCount,
    outgoingCount,
    unrepliedCount,
    messageCount: leadConversations.length,
    aiMessagesSent: leadData.ai_messages_sent || 0,
    aiLastMessageStage: leadData.ai_last_message_stage || undefined,
    aiSequencePaused: leadData.ai_sequence_paused || false,
    aiPauseReason: leadData.ai_pause_reason || undefined,
    aiResumeAt: leadData.ai_resume_at || undefined,
    // New unified AI strategy fields
    leadStatusTypeName: leadData.lead_status_type_name || undefined,
    leadTypeName: leadData.lead_type_name || undefined,
    leadSourceName: leadData.lead_source_name || undefined,
    messageIntensity: (leadData.message_intensity as 'gentle' | 'standard' | 'aggressive') || 'gentle',
    aiStrategyBucket: leadData.ai_strategy_bucket || undefined,
    aiAggressionLevel: leadData.ai_aggression_level || 3,
    aiStrategyLastUpdated: leadData.ai_strategy_last_updated || undefined,
    // Required properties
    first_name: leadData.first_name || '',
    last_name: leadData.last_name || '',
    created_at: leadData.created_at,
  };
};
