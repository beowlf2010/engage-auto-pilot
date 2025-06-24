
export interface LeadData {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  email?: string;
  email_alt?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  vehicle_interest?: string;
  vehicle_year?: number;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_vin?: string;
  source?: string;
  status?: string;
  salesperson_id?: string;
  ai_opt_in?: boolean;
  ai_contact_enabled?: boolean;
  ai_replies_enabled?: boolean;
  ai_stage?: string;
  next_ai_send_at?: string;
  created_at: string;
  do_not_call?: boolean;
  do_not_email?: boolean;
  do_not_mail?: boolean;
  ai_messages_sent?: number;
  ai_last_message_stage?: string;
  ai_sequence_paused?: boolean;
  ai_pause_reason?: string;
  ai_resume_at?: string;
  // New unified AI strategy fields
  lead_status_type_name?: string;
  lead_type_name?: string;
  lead_source_name?: string;
  message_intensity?: string;
  ai_strategy_bucket?: string;
  ai_aggression_level?: number;
  ai_strategy_last_updated?: string;
  // Relationships
  phone_numbers?: Array<{
    id: string;
    number: string;
    type: string;
    priority: number;
    status: string;
    is_primary: boolean;
    last_attempt?: string;
  }>;
  profiles?: {
    first_name?: string;
    last_name?: string;
  };
}

export interface ConversationData {
  id: string;
  lead_id: string;
  direction: string;
  body: string;
  sent_at: string;
  read_at?: string;
  sms_status?: string;
}
