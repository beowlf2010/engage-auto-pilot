import { supabase } from '@/integrations/supabase/client';

export interface PhoneNumber {
  id: string;
  number: string;
  isPrimary: boolean;
  type?: string;
  status?: string;
}

export interface TradeVehicle {
  id: string;
  year?: number;
  make?: string;
  model?: string;
  vin?: string;
  mileage?: number;
  condition?: string;
  estimatedValue?: number;
  owedAmount?: number;
  description?: string;
}

export interface Conversation {
  id: string;
  body: string;
  direction: 'in' | 'out';
  sentAt: string;
  readAt?: string;
  aiGenerated: boolean;
}

export interface ActivityTimelineItem {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

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
  source: string;
  status: string;
  vehicleInterest?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleVin?: string;
  createdAt: string;
  lastReplyAt?: string;
  preferredPriceMin?: number;
  preferredPriceMax?: number;
  notes?: string;
  phoneNumbers: PhoneNumber[];
  tradeVehicles: TradeVehicle[];
  conversations: Conversation[];
  activityTimeline: ActivityTimelineItem[];
  // AI fields with super aggressive defaults
  aiOptIn: boolean;
  messageIntensity: string;
  aiMessagesSent: number;
  aiStage?: string;
  aiSequencePaused: boolean;
  aiPauseReason?: string;
  pendingHumanResponse: boolean;
  nextAiSendAt?: string;
  // Communication preferences
  doNotCall: boolean;
  doNotEmail: boolean;
  doNotMail: boolean;
  // Other fields with safe defaults
  salespersonId?: string;
  salespersonName?: string;
  temperatureScore?: number;
  hasTradeVehicle: boolean;
  lastContactedAt?: string;
  totalMessages: number;
  averageResponseTime?: number;
  preferredContactMethod?: string;
  timezone?: string;
  bestContactHours?: number[];
  lastActivityAt?: string;
  leadScore?: number;
  convertedAt?: string;
  conversionValue?: number;
  appointmentBooked: boolean;
  lastAppointmentAt?: string;
  emailOptIn: boolean;
  smsOptIn: boolean;
  callOptIn: boolean;
  unsubscribed: boolean;
  doNotContact: boolean;
  aiSequenceStartedAt?: string;
  aiLastMessageAt?: string;
  manuallyAssigned: boolean;
  campaignSource?: string;
  referralSource?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  landingPage?: string;
  deviceType?: string;
  browserType?: string;
  ipAddress?: string;
  geoLocation?: string;
  // AI takeover settings
  aiTakeoverEnabled: boolean;
  aiTakeoverDelayMinutes?: number;
  // Additional trade fields
  tradeInVehicle?: string;
  tradePayoffAmount?: number;
  // Primary phone for easy access
  primaryPhone: string;
}

export const getLeadDetail = async (leadId: string): Promise<LeadDetailData | null> => {
  try {
    // Get lead details with phone numbers, trade vehicles, and salesperson info
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select(`
        *,
        phone_numbers (
          id,
          number,
          is_primary,
          type
        ),
        trade_vehicles (
          id,
          year,
          make,
          model,
          vin,
          mileage,
          condition,
          description
        ),
        profiles!salesperson_id (
          first_name,
          last_name
        )
      `)
      .eq('id', leadId)
      .single();

    if (leadError) {
      console.error('Error fetching lead detail:', leadError);
      return null;
    }

    if (!lead) {
      return null;
    }

    // Get conversations for this lead
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, body, direction, sent_at, read_at, ai_generated')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: true });

    // Count conversations for this lead
    const { count: messageCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('lead_id', leadId);

    // Check if lead has any appointments
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id, created_at')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(1);

    // Get primary phone number
    const primaryPhone = lead.phone_numbers?.find((p: any) => p.is_primary)?.number || 
                        lead.phone_numbers?.[0]?.number || '';

    // Create activity timeline from conversations
    const activityTimeline: ActivityTimelineItem[] = [
      {
        id: `lead-created-${lead.id}`,
        type: 'lead_created',
        description: 'Lead created',
        timestamp: lead.created_at
      },
      ...(conversations || []).map((conv: any) => ({
        id: conv.id,
        type: conv.direction === 'in' ? 'message_received' : 'message_sent',
        description: conv.direction === 'in' ? 'Message received' : 'Message sent',
        timestamp: conv.sent_at
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Transform the data to match our interface
    const leadDetail: LeadDetailData = {
      id: lead.id,
      firstName: lead.first_name || '',
      lastName: lead.last_name || '',
      middleName: lead.middle_name,
      email: lead.email,
      emailAlt: lead.email_alt,
      address: lead.address,
      city: lead.city,
      state: lead.state,
      postalCode: lead.postal_code,
      source: lead.source || 'unknown',
      status: lead.status || 'new',
      vehicleInterest: lead.vehicle_interest,
      vehicleMake: lead.vehicle_make,
      vehicleModel: lead.vehicle_model,
      vehicleYear: lead.vehicle_year,
      vehicleVin: lead.vehicle_vin,
      createdAt: lead.created_at,
      lastReplyAt: lead.last_reply_at,
      preferredPriceMin: lead.preferred_price_min,
      preferredPriceMax: lead.preferred_price_max,
      notes: lead.notes || '',
      phoneNumbers: (lead.phone_numbers || []).map((phone: any) => ({
        id: phone.id,
        number: phone.number,
        isPrimary: phone.is_primary,
        type: phone.type,
        status: 'active' // Default status since it's not in the database
      })),
      tradeVehicles: (lead.trade_vehicles || []).map((trade: any) => ({
        id: trade.id,
        year: trade.year,
        make: trade.make,
        model: trade.model,
        vin: trade.vin,
        mileage: trade.mileage,
        condition: trade.condition,
        estimatedValue: 0, // Default value since column doesn't exist
        owedAmount: 0, // Default value since column doesn't exist
        description: trade.description
      })),
      conversations: (conversations || []).map((conv: any) => ({
        id: conv.id,
        body: conv.body,
        direction: conv.direction,
        sentAt: conv.sent_at,
        readAt: conv.read_at,
        aiGenerated: conv.ai_generated
      })),
      activityTimeline: activityTimeline,
      primaryPhone: primaryPhone,
      // AI fields with super aggressive as the default
      aiOptIn: lead.ai_opt_in || false,
      messageIntensity: lead.message_intensity || 'super_aggressive',
      aiMessagesSent: lead.ai_messages_sent || 0,
      aiStage: lead.ai_stage,
      aiSequencePaused: lead.ai_sequence_paused || false,
      aiPauseReason: lead.ai_pause_reason,
      pendingHumanResponse: lead.pending_human_response || false,
      nextAiSendAt: lead.next_ai_send_at,
      // Communication preferences
      doNotCall: lead.do_not_call || false,
      doNotEmail: lead.do_not_email || false,
      doNotMail: lead.do_not_mail || false,
      // Other fields with safe defaults
      salespersonId: lead.salesperson_id,
      salespersonName: lead.profiles ? `${lead.profiles.first_name} ${lead.profiles.last_name}` : undefined,
      temperatureScore: lead.temperature_score,
      hasTradeVehicle: lead.has_trade_vehicle || false,
      lastContactedAt: undefined, // Field doesn't exist in schema
      totalMessages: messageCount || 0,
      averageResponseTime: undefined, // Field doesn't exist in schema
      preferredContactMethod: undefined, // Field doesn't exist in schema
      timezone: undefined, // Field doesn't exist in schema
      bestContactHours: undefined, // Field doesn't exist in schema
      lastActivityAt: undefined, // Field doesn't exist in schema
      leadScore: undefined, // Field doesn't exist in schema
      convertedAt: undefined, // Field doesn't exist in schema
      conversionValue: undefined, // Field doesn't exist in schema
      appointmentBooked: (appointments && appointments.length > 0) || false,
      lastAppointmentAt: appointments?.[0]?.created_at,
      emailOptIn: lead.email_opt_in ?? true,
      smsOptIn: true, // Default since column doesn't exist
      callOptIn: true, // Default since column doesn't exist
      unsubscribed: false, // Default since column doesn't exist
      doNotContact: false, // Default since column doesn't exist
      aiSequenceStartedAt: undefined, // Field doesn't exist in schema
      aiLastMessageAt: undefined, // Field doesn't exist in schema
      manuallyAssigned: false, // Default since column doesn't exist
      campaignSource: undefined, // Field doesn't exist in schema
      referralSource: undefined, // Field doesn't exist in schema
      utmSource: undefined, // Field doesn't exist in schema
      utmMedium: undefined, // Field doesn't exist in schema
      utmCampaign: undefined, // Field doesn't exist in schema
      landingPage: undefined, // Field doesn't exist in schema
      deviceType: undefined, // Field doesn't exist in schema
      browserType: undefined, // Field doesn't exist in schema
      ipAddress: undefined, // Field doesn't exist in schema
      geoLocation: undefined, // Field doesn't exist in schema
      // AI takeover settings
      aiTakeoverEnabled: lead.ai_takeover_enabled || false,
      aiTakeoverDelayMinutes: lead.ai_takeover_delay_minutes,
      // Additional trade fields - derive from trade vehicles
      tradeInVehicle: lead.trade_vehicles?.[0] ? 
        `${lead.trade_vehicles[0].year || ''} ${lead.trade_vehicles[0].make || ''} ${lead.trade_vehicles[0].model || ''}`.trim() : 
        undefined,
      tradePayoffAmount: 0 // Default since owed_amount doesn't exist
    };

    return leadDetail;

  } catch (error) {
    console.error('Error in getLeadDetail:', error);
    return null;
  }
};

export const updateLeadBasicInfo = async (
  leadId: string, 
  updates: Partial<{
    first_name: string;
    last_name: string;
    email: string;
    vehicle_interest: string;
    preferred_price_min: number;
    preferred_price_max: number;
    notes: string;
  }>
) => {
  const { error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', leadId);
  
  if (error) {
    throw error;
  }
};

export const updateLeadStatus = async (leadId: string, status: string) => {
  const { error } = await supabase
    .from('leads')
    .update({ status })
    .eq('id', leadId);
  
  if (error) {
    throw error;
  }
};
