
import { supabase } from '@/integrations/supabase/client';
import { ProcessedLead } from '@/components/upload-leads/duplicateDetection';
import { BulkInsertResult } from './leadOperations/types';
import { checkExistingDuplicates } from './leadOperations/duplicateChecker';
import { insertLeadsBulkEnhanced } from './leadOperations/enhancedBulkInserter';
import { updateUploadHistory } from './leadOperations/uploadHistoryService';

export interface BulkInsertOptions {
  updateExistingLeads?: boolean;
  allowPartialData?: boolean;
}

// Enhanced bulk insert with comprehensive error handling and validation
export const insertLeadsToDatabase = async (
  leads: ProcessedLead[], 
  uploadHistoryId?: string,
  options: BulkInsertOptions = {}
): Promise<BulkInsertResult> => {
  console.log(`🚀 [SUPABASE OPERATIONS] Starting enhanced database insertion for ${leads.length} leads`);
  console.log(`🚀 [SUPABASE OPERATIONS] Upload History ID: ${uploadHistoryId}`);
  console.log(`🚀 [SUPABASE OPERATIONS] Options:`, options);
  
  try {
    // First check for duplicates against existing database records
    console.log(`🔍 [SUPABASE OPERATIONS] Checking for existing duplicates...`);
    const duplicates = await checkExistingDuplicates(leads);
    console.log(`🔍 [SUPABASE OPERATIONS] Found ${duplicates.length} duplicates against existing database records`);
    
    // Filter out duplicates for insertion (unless update mode is enabled)
    let leadsToInsert = leads;
    if (!options.updateExistingLeads && duplicates.length > 0) {
      const duplicateIndexes = new Set(duplicates.map(d => d.rowIndex - 1));
      leadsToInsert = leads.filter((_, index) => !duplicateIndexes.has(index));
      console.log(`🔍 [SUPABASE OPERATIONS] Filtered to ${leadsToInsert.length} leads after removing duplicates`);
    }

    // Insert leads using enhanced bulk inserter
    console.log(`💾 [SUPABASE OPERATIONS] Starting bulk insertion of ${leadsToInsert.length} leads`);
    const insertResult = await insertLeadsBulkEnhanced(leadsToInsert, {
      updateExistingLeads: options.updateExistingLeads,
      allowPartialData: options.allowPartialData,
      uploadHistoryId
    });

    // Add duplicate information to the result
    const finalResult: BulkInsertResult = {
      ...insertResult,
      duplicates: duplicates.map(dup => ({
        leadData: dup.leadData,
        duplicateType: dup.duplicateType as 'phone' | 'email' | 'name',
        rowIndex: dup.rowIndex
      }))
    };

    console.log(`🎉 [SUPABASE OPERATIONS] Database insertion completed:`, {
      totalProcessed: finalResult.totalProcessed,
      successfulInserts: finalResult.successfulInserts,
      errors: finalResult.errors.length,
      duplicates: finalResult.duplicates.length
    });

    return finalResult;

  } catch (error) {
    console.error(`💥 [SUPABASE OPERATIONS] Critical error during database insertion:`, error);
    
    // Update upload history with failure status
    if (uploadHistoryId) {
      try {
        await updateUploadHistory(uploadHistoryId, {
          total_rows: leads.length,
          successful_imports: 0,
          failed_imports: leads.length,
          duplicate_imports: 0,
          processing_errors: [{
            error: error instanceof Error ? error.message : 'Critical insertion error',
            rowIndex: 0
          }],
          upload_status: 'failed'
        });
      } catch (historyError) {
        console.error(`⚠️ [SUPABASE OPERATIONS] Failed to update upload history with error:`, historyError);
      }
    }

    // Return error result
    return {
      totalProcessed: leads.length,
      successfulInserts: 0,
      successfulUpdates: 0,
      errors: leads.map((lead, index) => ({
        leadData: lead,
        error: error instanceof Error ? error.message : 'Critical insertion error',
        rowIndex: index + 1
      })),
      duplicates: []
    };
  }
};

// Re-export types for backward compatibility
export type { LeadInsertResult, BulkInsertResult } from './leadOperations/types';
