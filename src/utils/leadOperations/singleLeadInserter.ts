
import { supabase } from '@/integrations/supabase/client';
import { ProcessedLead } from '@/components/upload-leads/duplicateDetection';
import { LeadInsertResult } from './types';

export const insertSingleLead = async (lead: ProcessedLead): Promise<LeadInsertResult> => {
  try {
    // Insert the lead first
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .insert({
        first_name: lead.firstName,
        last_name: lead.lastName,
        middle_name: lead.middleName || null,
        email: lead.email || null,
        email_alt: lead.emailAlt || null,
        address: lead.address || null,
        city: lead.city || null,
        state: lead.state || null,
        postal_code: lead.postalCode || null,
        vehicle_interest: lead.vehicleInterest,
        vehicle_vin: lead.vehicleVIN || null,
        source: lead.source,
        do_not_call: lead.doNotCall,
        do_not_email: lead.doNotEmail,
        do_not_mail: lead.doNotMail,
        status: lead.status || 'new'
      })
      .select('id')
      .single();

    if (leadError) {
      return { success: false, error: leadError.message };
    }

    const leadId = leadData.id;

    // Insert phone numbers
    if (lead.phoneNumbers && lead.phoneNumbers.length > 0) {
      const phoneInserts = lead.phoneNumbers.map(phone => ({
        lead_id: leadId,
        number: phone.number,
        type: phone.type,
        priority: phone.priority,
        status: phone.status,
        is_primary: phone.priority === 1 // First phone (lowest priority number) is primary
      }));

      const { error: phoneError } = await supabase
        .from('phone_numbers')
        .insert(phoneInserts);

      if (phoneError) {
        // If phone insert fails, we should probably delete the lead too
        await supabase.from('leads').delete().eq('id', leadId);
        return { success: false, error: `Phone number error: ${phoneError.message}` };
      }
    }

    return { success: true, leadId };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};
