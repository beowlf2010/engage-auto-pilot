
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
}

export const insertEnhancedLead = async (lead: EnhancedLeadData): Promise<LeadInsertResult> => {
  try {
    // Calculate data quality score based on completeness
    const qualityScore = calculateDataQualityScore(lead);

    // Insert the lead with enhanced data preservation
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
        status: lead.status || 'new',
        // Enhanced data preservation fields
        upload_history_id: lead.uploadHistoryId || null,
        original_row_index: lead.originalRowIndex || null,
        raw_upload_data: lead.rawUploadData || {},
        original_status: lead.originalStatus || null,
        status_mapping_log: lead.statusMappingLog || {},
        salesperson_first_name: lead.salesPersonName?.split(' ')[0] || null,
        salesperson_last_name: lead.salesPersonName?.split(' ').slice(1).join(' ') || null,
        data_source_quality_score: qualityScore
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
        is_primary: phone.priority === 1
      }));

      const { error: phoneError } = await supabase
        .from('phone_numbers')
        .insert(phoneInserts);

      if (phoneError) {
        // If phone insert fails, delete the lead and return error
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
  if (lead.vehicleInterest && lead.vehicleInterest !== 'Not specified') score += 10;
  if (lead.vehicleVIN) score += 10;
  
  // Additional data (10 points total)
  if (lead.salesPersonName) score += 5;
  if (lead.source && lead.source !== 'CSV Import') score += 5;
  
  return Math.min(score, 100);
};
