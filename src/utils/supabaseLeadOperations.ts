
import { ProcessedLead } from '@/components/upload-leads/duplicateDetection';
import { BulkInsertResult } from './leadOperations/types';
import { checkExistingDuplicates } from './leadOperations/duplicateChecker';
import { insertSingleLead } from './leadOperations/singleLeadInserter';

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

// Re-export types for backward compatibility
export type { LeadInsertResult, BulkInsertResult } from './leadOperations/types';
