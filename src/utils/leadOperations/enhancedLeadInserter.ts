
import { supabase } from '@/integrations/supabase/client';
import { ProcessedLead } from '@/components/upload-leads/duplicateDetection';
import { LeadInsertResult } from './types';

export interface DetailedLeadInsertResult extends LeadInsertResult {
  validationErrors?: string[];
  phoneNumbersInserted?: number;
  rawError?: any;
}

export const insertLeadWithValidation = async (leadData: ProcessedLead, uploadHistoryId?: string): Promise<DetailedLeadInsertResult> => {
  console.log(`🔍 [LEAD INSERT] Starting insertion for: ${leadData.firstName} ${leadData.lastName}`);
  
  try {
    // Validate required fields before insertion
    const validationErrors: string[] = [];
    
    if (!leadData.firstName && !leadData.lastName) {
      validationErrors.push('Missing both first and last name');
    }
    
    if (!leadData.primaryPhone) {
      validationErrors.push('Missing primary phone number');
    }
    
    if (leadData.phoneNumbers.length === 0) {
      validationErrors.push('No phone numbers provided');
    }

    // If we have validation errors but flexible mode is enabled, proceed with warnings
    if (validationErrors.length > 0) {
      console.log(`⚠️ [LEAD INSERT] Validation warnings for ${leadData.firstName} ${leadData.lastName}:`, validationErrors);
    }

    // Prepare lead data for insertion
    const leadInsert = {
      first_name: leadData.firstName || '',
      last_name: leadData.lastName || '',
      middle_name: leadData.middleName || null,
      email: leadData.email || null,
      email_alt: leadData.emailAlt || null,
      address: leadData.address || null,
      city: leadData.city || null,
      state: leadData.state || null,
      postal_code: leadData.postalCode || null,
      vehicle_interest: leadData.vehicleInterest || 'finding the right vehicle for your needs',
      vehicle_vin: leadData.vehicleVIN || null,
      source: leadData.source || 'CSV Import',
      status: leadData.status || 'new',
      do_not_call: leadData.doNotCall || false,
      do_not_email: leadData.doNotEmail || false,
      do_not_mail: leadData.doNotMail || false,
      salesperson_first_name: leadData.salesPersonName ? leadData.salesPersonName.split(' ')[0] : null,
      salesperson_last_name: leadData.salesPersonName && leadData.salesPersonName.split(' ').length > 1 
        ? leadData.salesPersonName.split(' ').slice(1).join(' ') : null,
      upload_history_id: uploadHistoryId || null,
      // AI strategy fields
      lead_status_type_name: (leadData as any).leadStatusTypeName || null,
      lead_type_name: (leadData as any).leadTypeName || null,
      lead_source_name: (leadData as any).leadSourceName || null
    };

    console.log(`💾 [LEAD INSERT] Inserting lead data:`, { 
      firstName: leadInsert.first_name, 
      lastName: leadInsert.last_name,
      email: leadInsert.email,
      phoneCount: leadData.phoneNumbers.length,
      aiFields: {
        leadStatusTypeName: leadInsert.lead_status_type_name,
        leadTypeName: leadInsert.lead_type_name,
        leadSourceName: leadInsert.lead_source_name
      }
    });

    // Insert the lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert(leadInsert)
      .select('id')
      .single();

    if (leadError) {
      console.error(`❌ [LEAD INSERT] Lead insertion failed:`, {
        error: leadError,
        leadData: leadInsert
      });
      return { 
        success: false, 
        error: leadError.message,
        validationErrors,
        rawError: leadError
      };
    }

    console.log(`✅ [LEAD INSERT] Lead inserted successfully with ID: ${lead.id}`);

    // Insert phone numbers
    let phoneNumbersInserted = 0;
    if (leadData.phoneNumbers && leadData.phoneNumbers.length > 0) {
      console.log(`📞 [PHONE INSERT] Inserting ${leadData.phoneNumbers.length} phone numbers for lead ${lead.id}`);
      
      const phoneInserts = leadData.phoneNumbers.map(phone => ({
        lead_id: lead.id,
        number: phone.number,
        type: phone.type,
        priority: phone.priority,
        status: phone.status,
        is_primary: phone.isPrimary
      }));

      const { data: phoneData, error: phoneError } = await supabase
        .from('phone_numbers')
        .insert(phoneInserts)
        .select('id');

      if (phoneError) {
        console.error(`⚠️ [PHONE INSERT] Phone number insertion failed:`, phoneError);
        // Don't fail the whole operation for phone errors in flexible mode
        return { 
          success: true, 
          leadId: lead.id,
          validationErrors: [...validationErrors, `Phone insertion failed: ${phoneError.message}`],
          phoneNumbersInserted: 0
        };
      } else {
        phoneNumbersInserted = phoneData?.length || 0;
        console.log(`✅ [PHONE INSERT] Successfully inserted ${phoneNumbersInserted} phone numbers`);
      }
    }

    return { 
      success: true, 
      leadId: lead.id,
      validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
      phoneNumbersInserted
    };

  } catch (error) {
    console.error(`💥 [LEAD INSERT] Unexpected error:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      rawError: error,
      validationErrors: ['Unexpected insertion error']
    };
  }
};
