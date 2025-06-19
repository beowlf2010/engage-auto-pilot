export interface Appointment {
  id: string;
  lead_id: string;
  scheduled_at: string;
  duration_minutes: number;
  appointment_type: 'consultation' | 'test_drive' | 'service' | 'delivery' | 'follow_up' | 'other';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
  title: string;
  description?: string;
  location?: string;
  salesperson_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  cancelled_at?: string;
  cancel_reason?: string;
  confirmed_at?: string;
  completed_at?: string;
  no_show_at?: string;
  notes?: string;
  reminder_sent_at?: string;
  follow_up_required?: boolean;
  booking_source?: 'staff' | 'customer' | 'system';
  booking_token?: string;
  
  // Joined data
  lead_name?: string;
  salesperson_name?: string;
}

export interface CreateAppointmentData {
  lead_id: string;
  scheduled_at: string;
  duration_minutes?: number;
  appointment_type: 'consultation' | 'test_drive' | 'service' | 'delivery' | 'follow_up' | 'other';
  title: string;
  description?: string;
  location?: string;
  salesperson_id?: string;
  booking_source?: 'staff' | 'customer' | 'system';
  booking_token?: string;
}

export interface UpdateAppointmentData {
  scheduled_at?: string;
  duration_minutes?: number;
  appointment_type?: 'consultation' | 'test_drive' | 'service' | 'delivery' | 'follow_up' | 'other';
  status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
  title?: string;
  description?: string;
  location?: string;
  salesperson_id?: string;
  cancel_reason?: string;
  notes?: string;
  follow_up_required?: boolean;
}
