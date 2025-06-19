
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

  // ENHANCED: Context-aware appointment message generation
  generateContextualAppointmentMessage(
    appointmentLink: string, 
    leadName: string, 
    vehicleInterest?: string, 
    intentType: string = 'general',
    confidence: number = 0.5
  ): string {
    const vehicle = vehicleInterest || 'the vehicle you\'re interested in';
    
    // More assertive templates based on context
    const assertiveTemplates = {
      conversation_ending: [
        `Perfect! Let's lock in a time for you to see ${vehicle} in person. I have openings this week - book your preferred time here: ${appointmentLink}`,
        `Great! Since you're ready to move forward, let's schedule your visit. Pick a time that works for you: ${appointmentLink}`,
        `Excellent! Let's get you behind the wheel of ${vehicle}. Choose your appointment time here: ${appointmentLink}`
      ],
      
      interested_but_stalling: [
        `I can tell you're interested in ${vehicle}! Let's schedule a test drive so you can experience it firsthand. Book here: ${appointmentLink}`,
        `Since you like what you're hearing about ${vehicle}, let's set up a time to see it. Schedule your visit: ${appointmentLink}`,
        `You seem excited about ${vehicle}! Let's turn that interest into action - book your test drive: ${appointmentLink}`
      ],
      
      conversation_stalling: [
        `${leadName}, let's take the next step! I'd love to show you ${vehicle} in person. Book your appointment here: ${appointmentLink}`,
        `Ready to see ${vehicle} up close? Let's schedule your visit this week: ${appointmentLink}`,
        `Time to move forward! Let's get you scheduled to see ${vehicle}. Pick your time: ${appointmentLink}`
      ],
      
      test_drive: [
        `Absolutely! Let's get you scheduled for that test drive of ${vehicle}. Choose your time here: ${appointmentLink}`,
        `Perfect timing for a test drive! Book your appointment to experience ${vehicle}: ${appointmentLink}`,
        `Let's make it happen! Schedule your test drive of ${vehicle} here: ${appointmentLink}`
      ],
      
      consultation: [
        `Great idea! Let's schedule that consultation about ${vehicle}. Book your appointment: ${appointmentLink}`,
        `Perfect! Let's set up your consultation. Choose a convenient time: ${appointmentLink}`,
        `Excellent! Book your consultation time here: ${appointmentLink}`
      ],
      
      visit: [
        `Wonderful! Let's get you scheduled to visit and see ${vehicle}. Book here: ${appointmentLink}`,
        `Perfect! Schedule your visit to see ${vehicle} in person: ${appointmentLink}`,
        `Great! Let's set up your visit. Choose your time: ${appointmentLink}`
      ]
    };

    // Fallback assertive templates for high confidence scenarios
    const highConfidenceTemplates = [
      `${leadName}, you're clearly interested in ${vehicle}! Let's schedule your test drive this week: ${appointmentLink}`,
      `Time to take action on ${vehicle}! Book your appointment and let's make this happen: ${appointmentLink}`,
      `Ready to move forward with ${vehicle}? Let's get you scheduled: ${appointmentLink}`,
      `Don't wait - let's get you in to see ${vehicle}! Schedule here: ${appointmentLink}`
    ];

    // Medium confidence templates 
    const mediumConfidenceTemplates = [
      `I'd love to show you ${vehicle} in person, ${leadName}. When works best for you? Book here: ${appointmentLink}`,
      `Let's schedule a time for you to see ${vehicle}. Choose your preferred appointment: ${appointmentLink}`,
      `Ready to take the next step with ${vehicle}? Schedule your visit: ${appointmentLink}`,
      `Let's get you in to experience ${vehicle}! Book your appointment: ${appointmentLink}`
    ];

    // Select appropriate template based on context and confidence
    let templates;
    
    if (assertiveTemplates[intentType as keyof typeof assertiveTemplates]) {
      templates = assertiveTemplates[intentType as keyof typeof assertiveTemplates];
    } else if (confidence > 0.6) {
      templates = highConfidenceTemplates;
    } else {
      templates = mediumConfidenceTemplates;
    }

    // Return a random template for variety
    return templates[Math.floor(Math.random() * templates.length)];
  },

  // Generate appointment message templates with booking links
  generateAppointmentMessage(appointmentLink: string, leadName: string, vehicleInterest?: string): string {
    return this.generateContextualAppointmentMessage(appointmentLink, leadName, vehicleInterest, 'general', 0.5);
  }
};
