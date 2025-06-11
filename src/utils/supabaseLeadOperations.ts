
import { supabase } from '@/integrations/supabase/client';
import { ProcessedLead } from '@/components/upload-leads/duplicateDetection';

export interface LeadInsertResult {
  success: boolean;
  leadId?: string;
  error?: string;
}

export interface BulkInsertResult {
  totalProcessed: number;
  successfulInserts: number;
  errors: Array<{
    leadData: ProcessedLead;
    error: string;
    rowIndex: number;
  }>;
  duplicates: Array<{
    leadData: ProcessedLead;
    duplicateType: 'phone' | 'email' | 'name';
    rowIndex: number;
  }>;
}

// Check for existing leads in database to detect duplicates
const checkExistingDuplicates = async (leads: ProcessedLead[]): Promise<Array<{
  leadData: ProcessedLead;
  duplicateType: 'phone' | 'email' | 'name';
  rowIndex: number;
}>> => {
  const duplicates: Array<{
    leadData: ProcessedLead;
    duplicateType: 'phone' | 'email' | 'name';
    rowIndex: number;
  }> = [];

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    
    // Check for phone duplicates
    if (lead.primaryPhone) {
      const { data: phoneExists } = await supabase
        .from('phone_numbers')
        .select('id')
        .eq('number', lead.primaryPhone)
        .limit(1);
      
      if (phoneExists && phoneExists.length > 0) {
        duplicates.push({
          leadData: lead,
          duplicateType: 'phone',
          rowIndex: i + 1
        });
        continue;
      }
    }

    // Check for email duplicates
    if (lead.email) {
      const { data: emailExists } = await supabase
        .from('leads')
        .select('id')
        .eq('email', lead.email)
        .limit(1);
      
      if (emailExists && emailExists.length > 0) {
        duplicates.push({
          leadData: lead,
          duplicateType: 'email',
          rowIndex: i + 1
        });
        continue;
      }
    }

    // Check for name duplicates
    if (lead.firstName && lead.lastName) {
      const { data: nameExists } = await supabase
        .from('leads')
        .select('id')
        .eq('first_name', lead.firstName)
        .eq('last_name', lead.lastName)
        .limit(1);
      
      if (nameExists && nameExists.length > 0) {
        duplicates.push({
          leadData: lead,
          duplicateType: 'name',
          rowIndex: i + 1
        });
        continue;
      }
    }
  }

  return duplicates;
};

// Insert a single lead with phone numbers
const insertSingleLead = async (lead: ProcessedLead): Promise<LeadInsertResult> => {
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

// Bulk insert leads with duplicate detection
export const insertLeadsToDatabase = async (leads: ProcessedLead[]): Promise<BulkInsertResult> => {
  console.log(`Starting bulk insert for ${leads.length} leads`);
  
  // First check for duplicates against existing database records
  const duplicates = await checkExistingDuplicates(leads);
  console.log(`Found ${duplicates.length} duplicates against existing database records`);
  
  // Filter out duplicates
  const duplicateIndexes = new Set(duplicates.map(d => d.rowIndex - 1));
  const leadsToInsert = leads.filter((_, index) => !duplicateIndexes.has(index));
  
  console.log(`Proceeding to insert ${leadsToInsert.length} leads after filtering duplicates`);
  
  const errors: BulkInsertResult['errors'] = [];
  let successfulInserts = 0;

  // Insert leads one by one (could be optimized with batch operations later)
  for (let i = 0; i < leadsToInsert.length; i++) {
    const lead = leadsToInsert[i];
    const originalIndex = leads.indexOf(lead);
    
    const result = await insertSingleLead(lead);
    
    if (result.success) {
      successfulInserts++;
      console.log(`Successfully inserted lead ${i + 1}/${leadsToInsert.length}: ${lead.firstName} ${lead.lastName} (Status: ${lead.status})`);
    } else {
      errors.push({
        leadData: lead,
        error: result.error || 'Unknown error',
        rowIndex: originalIndex + 1
      });
      console.log(`Failed to insert lead ${i + 1}/${leadsToInsert.length}: ${result.error}`);
    }
  }

  console.log(`Bulk insert complete: ${successfulInserts} successful, ${errors.length} errors, ${duplicates.length} duplicates`);

  return {
    totalProcessed: leads.length,
    successfulInserts,
    errors,
    duplicates
  };
};
