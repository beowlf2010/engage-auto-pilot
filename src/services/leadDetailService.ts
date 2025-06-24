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
  // NEW: Original upload data fields
  rawUploadData?: Record<string, any>;
  leadTypeName?: string;
  leadStatusTypeName?: string;
  leadSourceName?: string;
  originalStatus?: string;
  statusMappingLog?: Record<string, any>;
  dataSourceQualityScore?: number;
  uploadHistoryId?: string;
  originalRowIndex?: number;
  aiStrategyBucket?: string;
  aiAggressionLevel?: number;
  aiStrategyLastUpdated?: string;
}

export const getLeadDetail = async (leadId: string): Promise<LeadDetailData | null> => {
  try {
    console.log('🔍 [LEAD DETAIL] Fetching lead with ID:', leadId);

    // Get lead details with phone numbers, trade vehicles, salesperson info, and upload data
    // Using LEFT JOIN for both salesperson and upload_history to handle leads without these relationships
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
          condition
        ),
        profiles:salesperson_id (
          first_name,
          last_name
        ),
        upload_history:upload_history_id (
          id,
          original_filename,
          upload_type,
          created_at
        )
      `)
      .eq('id', leadId)
      .maybeSingle();

    if (leadError) {
      console.error('❌ [LEAD DETAIL] Error fetching lead detail:', leadError);
      return null;
    }

    if (!lead) {
      console.log('❌ [LEAD DETAIL] No lead found with ID:', leadId);
      return null;
    }

    console.log('✅ [LEAD DETAIL] Found lead:', lead.first_name, lead.last_name);

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

    // Helper function to safely parse JSON fields
    const parseJsonField = (field: any): Record<string, any> => {
      if (!field) return {};
      if (typeof field === 'object' && field !== null) return field as Record<string, any>;
      if (typeof field === 'string') {
        try {
          return JSON.parse(field);
        } catch {
          return {};
        }
      }
      return {};
    };

    // Handle salesperson data - it might be null due to LEFT JOIN
    const salespersonName = lead.profiles 
      ? `${lead.profiles.first_name} ${lead.profiles.last_name}` 
      : 'Unassigned';

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
      vehicleYear: lead.vehicle_year ? parseInt(lead.vehicle_year) : undefined,
      vehicleVin: lead.vehicle_vin,
      createdAt: lead.created_at,
      lastReplyAt: lead.last_reply_at,
      preferredPriceMin: lead.preferred_price_min,
      preferredPriceMax: lead.preferred_price_max,
      notes: '',
      phoneNumbers: (lead.phone_numbers || []).map((phone: any) => ({
        id: phone.id,
        number: phone.number,
        isPrimary: phone.is_primary,
        type: phone.type,
        status: 'active'
      })),
      tradeVehicles: (lead.trade_vehicles || []).map((trade: any) => ({
        id: trade.id,
        year: trade.year,
        make: trade.make,
        model: trade.model,
        vin: trade.vin,
        mileage: trade.mileage,
        condition: trade.condition,
        estimatedValue: 0,
        owedAmount: 0,
        description: ''
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
      salespersonName: salespersonName,
      temperatureScore: lead.temperature_score,
      hasTradeVehicle: lead.has_trade_vehicle || false,
      lastContactedAt: undefined,
      totalMessages: messageCount || 0,
      averageResponseTime: undefined,
      preferredContactMethod: undefined,
      timezone: undefined,
      bestContactHours: undefined,
      lastActivityAt: undefined,
      leadScore: undefined,
      convertedAt: undefined,
      conversionValue: undefined,
      appointmentBooked: (appointments && appointments.length > 0) || false,
      lastAppointmentAt: appointments?.[0]?.created_at,
      emailOptIn: lead.email_opt_in ?? true,
      smsOptIn: true,
      callOptIn: true,
      unsubscribed: false,
      doNotContact: false,
      aiSequenceStartedAt: undefined,
      aiLastMessageAt: undefined,
      manuallyAssigned: false,
      campaignSource: undefined,
      referralSource: undefined,
      utmSource: undefined,
      utmMedium: undefined,
      utmCampaign: undefined,
      landingPage: undefined,
      deviceType: undefined,
      browserType: undefined,
      ipAddress: undefined,
      geoLocation: undefined,
      // AI takeover settings
      aiTakeoverEnabled: lead.ai_takeover_enabled || false,
      aiTakeoverDelayMinutes: lead.ai_takeover_delay_minutes,
      // Additional trade fields
      tradeInVehicle: undefined,
      tradePayoffAmount: 0,
      // NEW: Original upload data fields with proper type casting
      rawUploadData: parseJsonField(lead.raw_upload_data),
      leadTypeName: lead.lead_type_name,
      leadStatusTypeName: lead.lead_status_type_name,
      leadSourceName: lead.lead_source_name,
      originalStatus: lead.original_status,
      statusMappingLog: parseJsonField(lead.status_mapping_log),
      dataSourceQualityScore: lead.data_source_quality_score || 0,
      uploadHistoryId: lead.upload_history_id,
      originalRowIndex: lead.original_row_index,
      aiStrategyBucket: lead.ai_strategy_bucket,
      aiAggressionLevel: lead.ai_aggression_level,
      aiStrategyLastUpdated: lead.ai_strategy_last_updated
    };

    console.log('✅ [LEAD DETAIL] Successfully transformed lead data');
    return leadDetail;

  } catch (error) {
    console.error('❌ [LEAD DETAIL] Error in getLeadDetail:', error);
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
