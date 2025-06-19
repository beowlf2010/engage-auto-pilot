
import { supabase } from '@/integrations/supabase/client';

export interface AppointmentSlot {
  slot_date: string;
  slot_time: string;
  available_spots: number;
}

export interface SlotManagement {
  id: string;
  date: string;
  time_slot: string;
  is_available: boolean;
  max_appointments: number;
  current_bookings: number;
}

export const appointmentSlotsService = {
  // Get available appointment slots for customers
  async getAvailableSlots(startDate?: string, endDate?: string): Promise<AppointmentSlot[]> {
    const { data, error } = await supabase.rpc('get_available_appointment_slots', {
      start_date: startDate || new Date().toISOString().split('T')[0],
      end_date: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });

    if (error) throw error;
    return data || [];
  },

  // Book an appointment slot
  async bookSlot(date: string, time: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('book_appointment_slot', {
      p_date: date,
      p_time: time
    });

    if (error) throw error;
    return data || false;
  },

  // Admin: Get all slots for management
  async getAllSlots(startDate?: string, endDate?: string): Promise<SlotManagement[]> {
    const start = startDate || new Date().toISOString().split('T')[0];
    const end = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('appointment_slots')
      .select('*')
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: true })
      .order('time_slot', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Admin: Create new slots
  async createSlots(slots: Omit<SlotManagement, 'id' | 'current_bookings'>[]): Promise<void> {
    const { error } = await supabase
      .from('appointment_slots')
      .insert(slots);

    if (error) throw error;
  },

  // Admin: Update slot availability
  async updateSlot(id: string, updates: Partial<SlotManagement>): Promise<void> {
    const { error } = await supabase
      .from('appointment_slots')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  // Generate booking token for appointment
  async generateBookingToken(): Promise<string> {
    const { data, error } = await supabase.rpc('generate_booking_token');
    if (error) throw error;
    return data;
  }
};
