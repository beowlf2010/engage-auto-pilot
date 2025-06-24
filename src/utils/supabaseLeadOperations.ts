
import { ProcessedLead } from '@/components/upload-leads/duplicateDetection';
import { BulkInsertResult } from './leadOperations/types';
import { checkExistingDuplicates } from './leadOperations/duplicateChecker';
import { insertEnhancedLead, EnhancedLeadData } from './leadOperations/enhancedSingleLeadInserter';
import { updateExistingLead, EnhancedLeadUpdateData } from './leadOperations/enhancedLeadUpdater';
import { updateUploadHistory } from './leadOperations/uploadHistoryService';

export interface BulkInsertOptions {
  updateExistingLeads?: boolean;
}

// Enhanced bulk insert with comprehensive data preservation and update support
export const insertLeadsToDatabase = async (
  leads: ProcessedLead[], 
  uploadHistoryId?: string,
  options: BulkInsertOptions = {}
): Promise<BulkInsertResult> => {
  console.log(`Starting enhanced bulk insert for ${leads.length} leads`);
  console.log('Update mode:', options.updateExistingLeads ? 'enabled' : 'disabled');
  
  // First check for duplicates against existing database records
  const duplicates = await checkExistingDuplicates(leads);
  console.log(`Found ${duplicates.length} duplicates against existing database records`);
  
  const errors: BulkInsertResult['errors'] = [];
  const updates: Array<{ leadId: string; rowIndex: number }> = [];
  let successfulInserts = 0;
  let successfulUpdates = 0;

  if (options.updateExistingLeads) {
    // In update mode, process duplicates as updates
    for (const duplicate of duplicates) {
      const originalIndex = leads.indexOf(duplicate.leadData);
      
      // Prepare enhanced lead update data
      const enhancedLead: EnhancedLeadUpdateData = {
        ...duplicate.leadData,
        uploadHistoryId,
        originalRowIndex: duplicate.rowIndex,
        rawUploadData: (duplicate.leadData as any).rawUploadData || {},
        originalStatus: (duplicate.leadData as any).originalStatus,
        statusMappingLog: (duplicate.leadData as any).statusMappingLog || {},
        dataSourceQualityScore: 0 // Will be calculated in updateExistingLead
      };
      
      // Find the existing lead ID (we need to query for it)
      const existingLeadId = await findExistingLeadId(duplicate.leadData, duplicate.duplicateType);
      
      if (existingLeadId) {
        const result = await updateExistingLead(existingLeadId, enhancedLead);
        
        if (result.success) {
          if (result.updated) {
            successfulUpdates++;
            updates.push({ leadId: existingLeadId, rowIndex: duplicate.rowIndex });
            console.log(`Successfully updated lead ${duplicate.rowIndex}: ${duplicate.leadData.firstName} ${duplicate.leadData.lastName}`);
          } else {
            console.log(`No updates needed for lead ${duplicate.rowIndex}: ${duplicate.leadData.firstName} ${duplicate.leadData.lastName}`);
          }
        } else {
          errors.push({
            leadData: duplicate.leadData,
            error: result.error || 'Update failed',
            rowIndex: duplicate.rowIndex
          });
          console.log(`Failed to update lead ${duplicate.rowIndex}: ${result.error}`);
        }
      }
    }
    
    // Filter out duplicates from leads to insert
    const duplicateIndexes = new Set(duplicates.map(d => d.rowIndex - 1));
    const leadsToInsert = leads.filter((_, index) => !duplicateIndexes.has(index));
    
    console.log(`Proceeding to insert ${leadsToInsert.length} new leads after processing ${duplicates.length} updates`);
  } else {
    // In non-update mode, filter out duplicates as before
    const duplicateIndexes = new Set(duplicates.map(d => d.rowIndex - 1));
    const leadsToInsert = leads.filter((_, index) => !duplicateIndexes.has(index));
    
    console.log(`Proceeding to insert ${leadsToInsert.length} leads after filtering duplicates`);
  }

  // Insert new leads
  const duplicateIndexes = new Set(duplicates.map(d => d.rowIndex - 1));
  const leadsToInsert = leads.filter((_, index) => !duplicateIndexes.has(index));

  for (let i = 0; i < leadsToInsert.length; i++) {
    const lead = leadsToInsert[i];
    const originalIndex = leads.indexOf(lead);
    
    // Prepare enhanced lead data
    const enhancedLead: EnhancedLeadData = {
      ...lead,
      uploadHistoryId,
      originalRowIndex: originalIndex + 1,
      rawUploadData: (lead as any).rawUploadData || {},
      originalStatus: (lead as any).originalStatus,
      statusMappingLog: (lead as any).statusMappingLog || {},
      dataSourceQualityScore: 0 // Will be calculated in insertEnhancedLead
    };
    
    const result = await insertEnhancedLead(enhancedLead);
    
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

  // Update upload history with final results if provided
  if (uploadHistoryId) {
    try {
      const finalResults: any = {
        successful_imports: successfulInserts,
        failed_imports: errors.length,
        upload_status: 'completed'
      };

      if (options.updateExistingLeads) {
        finalResults.successful_updates = successfulUpdates;
        finalResults.duplicate_imports = duplicates.length - successfulUpdates; // Only count actual skipped duplicates
      } else {
        finalResults.duplicate_imports = duplicates.length;
      }

      await updateUploadHistory(uploadHistoryId, finalResults);
    } catch (error) {
      console.error('Error updating upload history:', error);
    }
  }

  const result = {
    totalProcessed: leads.length,
    successfulInserts,
    successfulUpdates: successfulUpdates || 0,
    errors,
    duplicates: options.updateExistingLeads ? duplicates.filter((_, index) => !updates.some(u => u.rowIndex === duplicates[index].rowIndex)) : duplicates
  };

  console.log(`Enhanced bulk operation complete: ${successfulInserts} inserted, ${successfulUpdates || 0} updated, ${errors.length} errors, ${result.duplicates.length} duplicates`);

  return result;
};

// Helper function to find existing lead ID based on duplicate type
const findExistingLeadId = async (leadData: ProcessedLead, duplicateType: string): Promise<string | null> => {
  let query = supabase.from('leads').select('id');

  if (duplicateType === 'phone') {
    // Find by phone number
    const { data: phoneData } = await supabase
      .from('phone_numbers')
      .select('lead_id')
      .eq('number', leadData.primaryPhone)
      .limit(1);
    
    return phoneData?.[0]?.lead_id || null;
  } else if (duplicateType === 'email') {
    const { data } = await query.eq('email', leadData.email).limit(1);
    return data?.[0]?.id || null;
  } else if (duplicateType === 'name') {
    const { data } = await query
      .eq('first_name', leadData.firstName)
      .eq('last_name', leadData.lastName)
      .limit(1);
    return data?.[0]?.id || null;
  }

  return null;
};

// Re-export types for backward compatibility
export type { LeadInsertResult, BulkInsertResult } from './leadOperations/types';
