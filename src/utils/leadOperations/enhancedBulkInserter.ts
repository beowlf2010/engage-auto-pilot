
import { ProcessedLead } from '@/components/upload-leads/duplicateDetection';
import { BulkInsertResult } from './types';
import { insertLeadWithValidation, DetailedLeadInsertResult } from './enhancedLeadInserter';
import { updateUploadHistory } from './uploadHistoryService';

export interface EnhancedBulkInsertOptions {
  updateExistingLeads?: boolean;
  allowPartialData?: boolean;
  uploadHistoryId?: string;
}

export const insertLeadsBulkEnhanced = async (
  leads: ProcessedLead[], 
  options: EnhancedBulkInsertOptions = {}
): Promise<BulkInsertResult> => {
  const { uploadHistoryId, allowPartialData = true } = options;
  
  console.log(`🚀 [BULK INSERT] Starting enhanced bulk insertion for ${leads.length} leads`);
  console.log(`🚀 [BULK INSERT] Options:`, { allowPartialData, uploadHistoryId });
  console.log(`🚀 [BULK INSERT] Sample leads:`, leads.slice(0, 3).map(lead => ({
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phoneCount: lead.phoneNumbers?.length || 0
  })));
  
  const errors: BulkInsertResult['errors'] = [];
  const warnings: string[] = [];
  let successfulInserts = 0;
  let totalValidationErrors = 0;
  let totalPhoneNumbersInserted = 0;

  // Process leads one by one with detailed logging
  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const rowIndex = i + 1;
    
    console.log(`📋 [BULK INSERT] Processing lead ${rowIndex}/${leads.length}: ${lead.firstName || 'Unknown'} ${lead.lastName || 'Lead'}`);
    
    try {
      const result: DetailedLeadInsertResult = await insertLeadWithValidation(lead, uploadHistoryId);
      
      if (result.success) {
        successfulInserts++;
        totalPhoneNumbersInserted += result.phoneNumbersInserted || 0;
        
        if (result.validationErrors && result.validationErrors.length > 0) {
          totalValidationErrors += result.validationErrors.length;
          warnings.push(`Row ${rowIndex}: ${result.validationErrors.join(', ')}`);
        }
        
        console.log(`✅ [BULK INSERT] Lead ${rowIndex} inserted successfully (ID: ${result.leadId})`);
      } else {
        errors.push({
          leadData: lead,
          error: result.error || 'Unknown insertion error',
          rowIndex
        });
        
        console.error(`❌ [BULK INSERT] Lead ${rowIndex} insertion failed:`, result.error);
        console.error(`❌ [BULK INSERT] Raw error:`, result.rawError);
        
        if (result.validationErrors) {
          console.error(`❌ [BULK INSERT] Validation errors:`, result.validationErrors);
        }
      }
    } catch (error) {
      errors.push({
        leadData: lead,
        error: error instanceof Error ? error.message : 'Unexpected error',
        rowIndex
      });
      
      console.error(`💥 [BULK INSERT] Unexpected error for lead ${rowIndex}:`, error);
    }
  }

  // Update upload history with accurate results
  if (uploadHistoryId) {
    try {
      console.log(`📊 [BULK INSERT] Updating upload history ${uploadHistoryId} with results`);
      
      await updateUploadHistory(uploadHistoryId, {
        total_rows: leads.length,
        successful_imports: successfulInserts,
        failed_imports: errors.length,
        duplicate_imports: 0, // Duplicates are handled separately
        processing_errors: errors.map(e => ({
          rowIndex: e.rowIndex,
          error: e.error,
          leadName: `${e.leadData.firstName || 'Unknown'} ${e.leadData.lastName || 'Lead'}`
        })),
        upload_status: successfulInserts > 0 ? 'completed' : 'failed'
      });
      
      console.log(`✅ [BULK INSERT] Upload history updated successfully`);
    } catch (historyError) {
      console.error(`⚠️ [BULK INSERT] Failed to update upload history:`, historyError);
    }
  }

  const result: BulkInsertResult = {
    totalProcessed: leads.length,
    successfulInserts,
    successfulUpdates: 0,
    errors,
    duplicates: []
  };

  console.log(`🎉 [BULK INSERT] Bulk insertion completed:`, {
    totalProcessed: result.totalProcessed,
    successfulInserts: result.successfulInserts,
    errors: result.errors.length,
    validationWarnings: totalValidationErrors,
    phoneNumbersInserted: totalPhoneNumbersInserted
  });

  if (warnings.length > 0) {
    console.log(`⚠️ [BULK INSERT] Validation warnings:`, warnings);
  }

  if (errors.length > 0) {
    console.log(`❌ [BULK INSERT] All errors:`, errors);
  }

  return result;
};
