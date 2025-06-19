
import { supabase } from '@/integrations/supabase/client';

export interface AppointmentLinkOptions {
  leadId: string;
  leadName: string;
  vehicleInterest?: string;
  preferredDate?: string;
  preferredTime?: string;
}

export const appointmentLinkService = {
  // Generate a personalized appointment booking link for a lead
  async generateBookingLink(options: AppointmentLinkOptions): Promise<string> {
    try {
      // Generate a unique booking token
      const { data: tokenData, error: tokenError } = await supabase.rpc('generate_booking_token');
      
      if (tokenError || !tokenData) {
        console.error('Error generating booking token:', tokenError);
        // Fallback to basic link without token
        return `${window.location.origin}/book-appointment/${options.leadId}`;
      }

      // Create the personalized booking URL with pre-filled information
      const params = new URLSearchParams({
        token: tokenData,
        name: options.leadName,
        ...(options.vehicleInterest && { vehicle: options.vehicleInterest }),
        ...(options.preferredDate && { date: options.preferredDate }),
        ...(options.preferredTime && { time: options.preferredTime })
      });

      return `${window.location.origin}/book-appointment/${options.leadId}?${params.toString()}`;
    } catch (error) {
      console.error('Error generating appointment booking link:', error);
      // Fallback to basic link
      return `${window.location.origin}/book-appointment/${options.leadId}`;
    }
  },

  // Generate appointment message templates with booking links
  generateAppointmentMessage(appointmentLink: string, leadName: string, vehicleInterest?: string): string {
    const templates = [
      `Hi ${leadName}! I'd love to help you with ${vehicleInterest || 'your vehicle search'}. Would you like to schedule a time to meet? You can book an appointment here: ${appointmentLink}`,
      
      `${leadName}, I can answer any questions about ${vehicleInterest || 'our vehicles'} in person! Feel free to schedule a convenient time: ${appointmentLink}`,
      
      `Great to hear from you, ${leadName}! Let's set up a time to discuss ${vehicleInterest || 'your vehicle needs'} in detail. Book here: ${appointmentLink}`,
      
      `${leadName}, I'm here to help with ${vehicleInterest || 'finding the right vehicle'}! When would be a good time to meet? Schedule here: ${appointmentLink}`
    ];

    // Return a random template for variety
    return templates[Math.floor(Math.random() * templates.length)];
  }
};
