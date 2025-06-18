
import { supabase } from '@/integrations/supabase/client';
import type { Appointment, CreateAppointmentData, UpdateAppointmentData } from '@/types/appointment';

export const appointmentService = {
  // Get all appointments for a lead
  async getAppointmentsByLead(leadId: string): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        leads!inner(first_name, last_name),
        profiles:salesperson_id(first_name, last_name)
      `)
      .eq('lead_id', leadId)
      .order('scheduled_at', { ascending: true });

    if (error) throw error;

    return data.map(appointment => ({
      ...appointment,
      lead_name: `${appointment.leads.first_name} ${appointment.leads.last_name}`,
      salesperson_name: appointment.profiles 
        ? `${appointment.profiles.first_name} ${appointment.profiles.last_name}`
        : undefined
    }));
  },

  // Get all appointments for current user
  async getMyAppointments(): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        leads!inner(first_name, last_name),
        profiles:salesperson_id(first_name, last_name)
      `)
      .order('scheduled_at', { ascending: true });

    if (error) throw error;

    return data.map(appointment => ({
      ...appointment,
      lead_name: `${appointment.leads.first_name} ${appointment.leads.last_name}`,
      salesperson_name: appointment.profiles 
        ? `${appointment.profiles.first_name} ${appointment.profiles.last_name}`
        : undefined
    }));
  },

  // Create a new appointment
  async createAppointment(appointmentData: CreateAppointmentData): Promise<Appointment> {
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        ...appointmentData,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select(`
        *,
        leads!inner(first_name, last_name),
        profiles:salesperson_id(first_name, last_name)
      `)
      .single();

    if (error) throw error;

    return {
      ...data,
      lead_name: `${data.leads.first_name} ${data.leads.last_name}`,
      salesperson_name: data.profiles 
        ? `${data.profiles.first_name} ${data.profiles.last_name}`
        : undefined
    };
  },

  // Update an appointment
  async updateAppointment(appointmentId: string, updateData: UpdateAppointmentData): Promise<Appointment> {
    const { data, error } = await supabase
      .from('appointments')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .select(`
        *,
        leads!inner(first_name, last_name),
        profiles:salesperson_id(first_name, last_name)
      `)
      .single();

    if (error) throw error;

    return {
      ...data,
      lead_name: `${data.leads.first_name} ${data.leads.last_name}`,
      salesperson_name: data.profiles 
        ? `${data.profiles.first_name} ${data.profiles.last_name}`
        : undefined
    };
  },

  // Delete an appointment
  async deleteAppointment(appointmentId: string): Promise<void> {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', appointmentId);

    if (error) throw error;
  },

  // Confirm an appointment
  async confirmAppointment(appointmentId: string): Promise<Appointment> {
    return this.updateAppointment(appointmentId, {
      status: 'confirmed',
      // confirmed_at will be set by a trigger or default
    });
  },

  // Cancel an appointment
  async cancelAppointment(appointmentId: string, reason?: string): Promise<Appointment> {
    return this.updateAppointment(appointmentId, {
      status: 'cancelled',
      cancel_reason: reason,
      // cancelled_at will be set by a trigger or default
    });
  },

  // Mark appointment as completed
  async completeAppointment(appointmentId: string, notes?: string): Promise<Appointment> {
    return this.updateAppointment(appointmentId, {
      status: 'completed',
      notes,
      // completed_at will be set by a trigger or default
    });
  },

  // Mark appointment as no-show
  async markNoShow(appointmentId: string, notes?: string): Promise<Appointment> {
    return this.updateAppointment(appointmentId, {
      status: 'no_show',
      notes,
      // no_show_at will be set by a trigger or default
    });
  }
};
