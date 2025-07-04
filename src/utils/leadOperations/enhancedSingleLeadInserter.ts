
import { supabase } from '@/integrations/supabase/client';
import { ProcessedLead } from '@/components/upload-leads/duplicateDetection';
import { LeadInsertResult } from './types';

export interface EnhancedLeadData extends ProcessedLead {
  uploadHistoryId?: string;
  originalRowIndex?: number;
  rawUploadData?: Record<string, any>;
  originalStatus?: string;
  statusMappingLog?: Record<string, any>;
  dataSourceQualityScore?: number;
  leadStatusTypeName?: string;
  leadTypeName?: string;
  leadSourceName?: string;
}

export const insertEnhancedLead = async (leadData: EnhancedLeadData): Promise<LeadInsertResult> => {
  try {
    // Calculate data quality score
    const qualityScore = calculateDataQualityScore(leadData);

    // Prepare lead data for insertion - ensure AI strategy fields are included
    const leadInsert = {
      first_name: leadData.firstName,
      last_name: leadData.lastName,
      middle_name: leadData.middleName,
      email: leadData.email,
      email_alt: leadData.emailAlt,
      address: leadData.address,
      city: leadData.city,
      state: leadData.state,
      postal_code: leadData.postalCode,
      vehicle_interest: leadData.vehicleInterest,
      vehicle_vin: leadData.vehicleVIN,
      source: leadData.source,
      status: leadData.status,
      do_not_call: leadData.doNotCall,
      do_not_email: leadData.doNotEmail,
      do_not_mail: leadData.doNotMail,
      salesperson_first_name: leadData.salesPersonName ? leadData.salesPersonName.split(' ')[0] : null,
      salesperson_last_name: leadData.salesPersonName && leadData.salesPersonName.split(' ').length > 1 
        ? leadData.salesPersonName.split(' ').slice(1).join(' ') : null,
      // Enhanced preservation fields
      upload_history_id: leadData.uploadHistoryId,
      raw_upload_data: leadData.rawUploadData,
      original_status: leadData.originalStatus,
      status_mapping_log: leadData.statusMappingLog,
      data_source_quality_score: qualityScore,
      // AI strategy fields - ensure they're properly saved with validation
      lead_type_name: leadData.leadTypeName && leadData.leadTypeName.trim() !== '' ? leadData.leadTypeName.trim() : null,
      lead_status_type_name: leadData.leadStatusTypeName && leadData.leadStatusTypeName.trim() !== '' ? leadData.leadStatusTypeName.trim() : null,
      lead_source_name: leadData.leadSourceName && leadData.leadSourceName.trim() !== '' ? leadData.leadSourceName.trim() : null
    };

    console.log('💾 [DATABASE INSERT] Inserting lead with AI strategy fields:', {
      firstName: leadInsert.first_name,
      lastName: leadInsert.last_name,
      lead_type_name: leadInsert.lead_type_name,
      lead_status_type_name: leadInsert.lead_status_type_name,
      lead_source_name: leadInsert.lead_source_name
    });

    // Insert the lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert(leadInsert)
      .select('id, lead_type_name, lead_status_type_name, lead_source_name')
      .single();

    if (leadError) {
      console.error('❌ [DATABASE INSERT] Lead insertion error:', leadError);
      return { success: false, error: leadError.message };
    }

    console.log(`✅ [DATABASE INSERT] Successfully inserted lead ${lead.id} with AI strategy fields:`, {
      lead_type_name: lead.lead_type_name,
      lead_status_type_name: lead.lead_status_type_name,
      lead_source_name: lead.lead_source_name
    });

    // Insert phone numbers
    if (leadData.phoneNumbers && leadData.phoneNumbers.length > 0) {
      const phoneInserts = leadData.phoneNumbers.map(phone => ({
        lead_id: lead.id,
        number: phone.number,
        type: phone.type,
        priority: phone.priority,
        status: phone.status,
        is_primary: phone.priority === 1
      }));

      const { error: phoneError } = await supabase
        .from('phone_numbers')
        .insert(phoneInserts);

      if (phoneError) {
        console.error('⚠️ [DATABASE INSERT] Phone number insertion error:', phoneError);
        // Don't fail the whole operation for phone errors
      }
    }

    return { success: true, leadId: lead.id };
  } catch (error) {
    console.error('❌ [DATABASE INSERT] Enhanced lead insertion error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

const calculateDataQualityScore = (lead: EnhancedLeadData): number => {
  let score = 0;
  
  // Basic required fields (40 points total)
  if (lead.firstName) score += 10;
  if (lead.lastName) score += 10;
  if (lead.primaryPhone) score += 20;
  
  // Contact information (30 points total)
  if (lead.email) score += 15;
  if (lead.address) score += 5;
  if (lead.city) score += 5;
  if (lead.state) score += 3;
  if (lead.postalCode) score += 2;
  
  // Vehicle information (20 points total)
  if (lead.vehicleInterest && lead.vehicleInterest !== 'finding the right vehicle for your needs') score += 10;
  if (lead.vehicleVIN) score += 10;
  
  // Additional data and AI strategy fields (10 points total)
  if (lead.salesPersonName) score += 2;
  if (lead.source && lead.source !== 'CSV Import') score += 2;
  if (lead.leadTypeName) score += 2;
  if (lead.leadStatusTypeName) score += 2;
  if (lead.leadSourceName) score += 2;
  
  return Math.min(score, 100);
};
