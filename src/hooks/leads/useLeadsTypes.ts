
export interface LeadDataFromDB {
  id: string;
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  email: string | null;
  email_alt: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  vehicle_interest: string | null;
  source: string | null;
  status: string | null;
  salesperson_id: string | null;
  ai_opt_in: boolean | null;
  ai_stage: string | null;
  next_ai_send_at: string | null;
  created_at: string;
  do_not_call: boolean | null;
  do_not_email: boolean | null;
  do_not_mail: boolean | null;
  vehicle_year: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_vin: string | null;
  ai_messages_sent: number | null;
  ai_last_message_stage: string | null;
  ai_sequence_paused: boolean | null;
  ai_pause_reason: string | null;
  ai_resume_at: string | null;
  lead_status_type_name: string | null;
  lead_type_name: string | null;
  lead_source_name: string | null;
  message_intensity: string | null;
  ai_strategy_bucket: string | null;
  ai_aggression_level: number | null;
  ai_strategy_last_updated: string | null;
  is_hidden: boolean | null;
  phone_numbers?: PhoneNumberFromDB[];
  profiles?: ProfileFromDB | null;
}

export interface PhoneNumberFromDB {
  id: string;
  number: string;
  type: string;
  priority: number;
  status: string;
  is_primary: boolean;
}

export interface ProfileFromDB {
  first_name: string | null;
  last_name: string | null;
}

export interface ConversationFromDB {
  lead_id: string;
  direction: string;
  read_at: string | null;
  body: string;
  sent_at: string;
}
