
import { ProcessedLead } from '@/components/upload-leads/duplicateDetection';
import { BulkInsertResult } from './leadOperations/types';
import { checkExistingDuplicates } from './leadOperations/duplicateChecker';
import { insertEnhancedLead, EnhancedLeadData } from './leadOperations/enhancedSingleLeadInserter';
import { updateUploadHistory } from './leadOperations/uploadHistoryService';

// Enhanced bulk insert with comprehensive data preservation
export const insertLeadsToDatabase = async (
  leads: ProcessedLead[], 
  uploadHistoryId?: string
): Promise<BulkInsertResult> => {
  console.log(`Starting enhanced bulk insert for ${leads.length} leads`);
  
  // First check for duplicates against existing database records
  const duplicates = await checkExistingDuplicates(leads);
  console.log(`Found ${duplicates.length} duplicates against existing database records`);
  
  // Filter out duplicates
  const duplicateIndexes = new Set(duplicates.map(d => d.rowIndex - 1));
  const leadsToInsert = leads.filter((_, index) => !duplicateIndexes.has(index));
  
  console.log(`Proceeding to insert ${leadsToInsert.length} leads after filtering duplicates`);
  
  const errors: BulkInsertResult['errors'] = [];
  let successfulInserts = 0;

  // Insert leads with enhanced data preservation
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
      await updateUploadHistory(uploadHistoryId, {
        successful_imports: successfulInserts,
        failed_imports: errors.length,
        duplicate_imports: duplicates.length,
        upload_status: 'completed'
      });
    } catch (error) {
      console.error('Error updating upload history:', error);
    }
  }

  console.log(`Enhanced bulk insert complete: ${successfulInserts} successful, ${errors.length} errors, ${duplicates.length} duplicates`);

  return {
    totalProcessed: leads.length,
    successfulInserts,
    errors,
    duplicates
  };
};

// Re-export types for backward compatibility
export type { LeadInsertResult, BulkInsertResult } from './leadOperations/types';
