
import { supabase } from '@/integrations/supabase/client';
import { ProcessedLead } from '@/components/upload-leads/duplicateDetection';
import { LeadInsertResult } from './types';
import { validateRLSPermissions } from './enhancedRLSHandler';

export interface DetailedLeadInsertResult extends LeadInsertResult {
  validationErrors?: string[];
  phoneNumbersInserted?: number;
  rawError?: any;
  rlsValidation?: any;
}

export const insertLeadWithValidation = async (leadData: ProcessedLead, uploadHistoryId?: string): Promise<DetailedLeadInsertResult> => {
  console.log(`🔍 [LEAD INSERT] Starting insertion for: ${leadData.firstName || 'Unknown'} ${leadData.lastName || 'Lead'}`);
  
  try {
    // Validate RLS permissions before attempting insertion
    const rlsValidation = await validateRLSPermissions();
    console.log(`🔍 [LEAD INSERT] RLS validation result:`, rlsValidation);
    
    if (!rlsValidation.canInsert) {
      console.error(`❌ [LEAD INSERT] RLS validation failed:`, rlsValidation.error);
      return { 
        success: false, 
        error: `Permission denied: ${rlsValidation.error}`,
        rlsValidation,
        validationErrors: ['User lacks required permissions for lead insertion']
      };
    }

    console.log(`✅ [LEAD INSERT] RLS validation passed for user with roles:`, rlsValidation.userRoles);

    // Validate required fields - more flexible approach with NULL names allowed
    const validationErrors: string[] = [];
    
    // Allow leads with missing names now that schema supports NULL
    if (!leadData.firstName && !leadData.lastName) {
      console.warn(`⚠️ [LEAD INSERT] Lead has no name information`);
      validationErrors.push('Lead has no name information - will be imported for manual review');
    }
    
    if (!leadData.primaryPhone && (!leadData.phoneNumbers || leadData.phoneNumbers.length === 0)) {
      console.warn(`⚠️ [LEAD INSERT] No phone numbers provided`);
      validationErrors.push('No phone numbers provided - lead may need manual contact information');
    }

    // Prepare lead data for insertion - handle NULL names properly
    const leadInsert = {
      first_name: leadData.firstName || null,
      last_name: leadData.lastName || null,
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

    console.log(`💾 [LEAD INSERT] Inserting lead data:`, leadInsert);

    // Insert the lead using the clean RLS policies
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert(leadInsert)
      .select('id')
      .single();

    if (leadError) {
      console.error(`❌ [LEAD INSERT] Lead insertion failed:`, leadError);
      return { 
        success: false, 
        error: `Database insertion failed: ${leadError.message}`,
        validationErrors,
        rawError: leadError,
        rlsValidation
      };
    }

    console.log(`✅ [LEAD INSERT] Lead inserted successfully with ID: ${lead.id}`);

    // Insert phone numbers using the clean RLS policies
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
        validationErrors.push(`Phone insertion failed: ${phoneError.message}`);
        phoneNumbersInserted = 0;
      } else {
        phoneNumbersInserted = phoneData?.length || 0;
        console.log(`✅ [PHONE INSERT] Successfully inserted ${phoneNumbersInserted} phone numbers`);
      }
    }

    return { 
      success: true, 
      leadId: lead.id,
      validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
      phoneNumbersInserted,
      rlsValidation
    };

  } catch (error) {
    console.error(`💥 [LEAD INSERT] Unexpected error:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown database error',
      rawError: error,
      validationErrors: ['Critical insertion error - please check data format and user permissions']
    };
  }
};
