import { supabase } from '@/integrations/supabase/client';
import { ProcessedLead } from '@/components/upload-leads/duplicateDetection';
import { LeadInsertResult } from './types';

export interface EnhancedLeadUpdateData extends ProcessedLead {
  uploadHistoryId?: string;
  originalRowIndex?: number;
  rawUploadData?: Record<string, any>;
  originalStatus?: string;
  statusMappingLog?: Record<string, any>;
  dataSourceQualityScore?: number;
}

export const updateExistingLead = async (
  existingLeadId: string, 
  newLeadData: EnhancedLeadUpdateData
): Promise<LeadInsertResult> => {
  try {
    // First, get the existing lead data to compare
    const { data: existingLead, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', existingLeadId)
      .single();

    if (fetchError || !existingLead) {
      return { success: false, error: 'Could not fetch existing lead data' };
    }

    // Calculate data quality score for new data
    const qualityScore = calculateDataQualityScore(newLeadData);

    // Prepare updates - only update fields that are empty/null or have better data
    const updates: Record<string, any> = {};

    // Update contact information if missing or improved
    if (!existingLead.middle_name && newLeadData.middleName) {
      updates.middle_name = newLeadData.middleName;
    }
    
    if (!existingLead.email && newLeadData.email) {
      updates.email = newLeadData.email;
    }
    
    if (!existingLead.email_alt && newLeadData.emailAlt) {
      updates.email_alt = newLeadData.emailAlt;
    }

    // Update address information if missing
    if (!existingLead.address && newLeadData.address) {
      updates.address = newLeadData.address;
    }
    
    if (!existingLead.city && newLeadData.city) {
      updates.city = newLeadData.city;
    }
    
    if (!existingLead.state && newLeadData.state) {
      updates.state = newLeadData.state;
    }
    
    if (!existingLead.postal_code && newLeadData.postalCode) {
      updates.postal_code = newLeadData.postalCode;
    }

    // Update vehicle information if missing or more detailed
    if (!existingLead.vehicle_vin && newLeadData.vehicleVIN) {
      updates.vehicle_vin = newLeadData.vehicleVIN;
    }

    // Update vehicle interest if current one is generic and new one is specific
    if (existingLead.vehicle_interest === 'finding the right vehicle for your needs' && 
        newLeadData.vehicleInterest !== 'finding the right vehicle for your needs') {
      updates.vehicle_interest = newLeadData.vehicleInterest;
    }

    // Update salesperson information if missing
    const newSalesPersonParts = newLeadData.salesPersonName ? newLeadData.salesPersonName.split(' ') : [];
    const newSalesPersonFirstName = newSalesPersonParts.length > 0 ? newSalesPersonParts[0] : null;
    const newSalesPersonLastName = newSalesPersonParts.length > 1 ? newSalesPersonParts.slice(1).join(' ') : null;

    if (!existingLead.salesperson_first_name && newSalesPersonFirstName) {
      updates.salesperson_first_name = newSalesPersonFirstName;
    }
    
    if (!existingLead.salesperson_last_name && newSalesPersonLastName) {
      updates.salesperson_last_name = newSalesPersonLastName;
    }

    // Update AI strategy fields if missing
    if (!existingLead.lead_status_type_name && (newLeadData as any).leadStatusTypeName) {
      updates.lead_status_type_name = (newLeadData as any).leadStatusTypeName;
    }
    
    if (!existingLead.lead_type_name && (newLeadData as any).leadTypeName) {
      updates.lead_type_name = (newLeadData as any).leadTypeName;
    }
    
    if (!existingLead.lead_source_name && (newLeadData as any).leadSourceName) {
      updates.lead_source_name = (newLeadData as any).leadSourceName;
    }

    // Update data source quality score if new data is better quality
    if (qualityScore > (existingLead.data_source_quality_score || 0)) {
      updates.data_source_quality_score = qualityScore;
    }

    // Add update tracking fields
    if (Object.keys(updates).length > 0) {
      updates.upload_history_id = newLeadData.uploadHistoryId;
      
      // Safely handle raw_upload_data spreading
      const existingRawData = existingLead.raw_upload_data && typeof existingLead.raw_upload_data === 'object' 
        ? existingLead.raw_upload_data as Record<string, any>
        : {};
      
      updates.raw_upload_data = {
        ...existingRawData,
        latest_update: newLeadData.rawUploadData
      };
      updates.updated_at = new Date().toISOString();
    }

    // Only proceed if there are actual updates
    if (Object.keys(updates).length === 0) {
      return { success: true, leadId: existingLeadId, updated: false };
    }

    // Perform the update
    const { error: updateError } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', existingLeadId);

    if (updateError) {
      console.error('Lead update error:', updateError);
      return { success: false, error: updateError.message };
    }

    // Handle phone number updates
    await updatePhoneNumbers(existingLeadId, newLeadData.phoneNumbers);

    return { success: true, leadId: existingLeadId, updated: true };
  } catch (error) {
    console.error('Enhanced lead update error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

const updatePhoneNumbers = async (leadId: string, newPhoneNumbers: any[]) => {
  // Get existing phone numbers
  const { data: existingPhones } = await supabase
    .from('phone_numbers')
    .select('*')
    .eq('lead_id', leadId);

  const existingNumbers = existingPhones?.map(p => p.number) || [];

  // Add new phone numbers that don't already exist
  const phonesToAdd = newPhoneNumbers.filter(phone => 
    !existingNumbers.includes(phone.number)
  );

  if (phonesToAdd.length > 0) {
    const phoneInserts = phonesToAdd.map(phone => ({
      lead_id: leadId,
      number: phone.number,
      type: phone.type,
      priority: phone.priority,
      status: phone.status,
      is_primary: phone.priority === 1 && existingNumbers.length === 0 // Only set as primary if no existing phones
    }));

    await supabase
      .from('phone_numbers')
      .insert(phoneInserts);
  }
};

const calculateDataQualityScore = (lead: EnhancedLeadUpdateData): number => {
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
  
  // Additional data (10 points total)
  if (lead.salesPersonName) score += 5;
  if (lead.source && lead.source !== 'CSV Import') score += 5;
  
  return Math.min(score, 100);
};
