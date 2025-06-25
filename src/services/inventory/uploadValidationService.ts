
import { supabase } from "@/integrations/supabase/client";

export interface UploadValidationResult {
  isValid: boolean;
  actualInsertedCount: number;
  reportedSuccessCount: number;
  mismatch: boolean;
  reason?: string;
}

export const validateUploadSuccess = async (uploadId: string): Promise<UploadValidationResult> => {
  try {
    console.log(`🔍 Validating upload success for ${uploadId}...`);
    
    // Get reported success count from upload history
    const { data: uploadRecord, error: uploadError } = await supabase
      .from('upload_history')
      .select('successful_imports, total_rows, original_filename')
      .eq('id', uploadId)
      .single();

    if (uploadError) {
      return {
        isValid: false,
        actualInsertedCount: 0,
        reportedSuccessCount: 0,
        mismatch: true,
        reason: `Could not fetch upload record: ${uploadError.message}`
      };
    }

    // Get actual inserted vehicle count
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('inventory')
      .select('id', { count: 'exact' })
      .eq('upload_history_id', uploadId);

    if (vehiclesError) {
      return {
        isValid: false,
        actualInsertedCount: 0,
        reportedSuccessCount: uploadRecord.successful_imports || 0,
        mismatch: true,
        reason: `Could not count inserted vehicles: ${vehiclesError.message}`
      };
    }

    const actualInsertedCount = vehicles?.length || 0;
    const reportedSuccessCount = uploadRecord.successful_imports || 0;
    const mismatch = actualInsertedCount !== reportedSuccessCount;

    console.log(`📋 Upload validation for ${uploadRecord.original_filename}:`);
    console.log(`   Reported: ${reportedSuccessCount} successful imports`);
    console.log(`   Actual: ${actualInsertedCount} vehicles in database`);
    console.log(`   Mismatch: ${mismatch ? 'YES' : 'NO'}`);

    return {
      isValid: !mismatch && actualInsertedCount > 0,
      actualInsertedCount,
      reportedSuccessCount,
      mismatch,
      reason: mismatch 
        ? `Mismatch: reported ${reportedSuccessCount} but found ${actualInsertedCount} in database`
        : undefined
    };
  } catch (error) {
    console.error('Error validating upload:', error);
    return {
      isValid: false,
      actualInsertedCount: 0,
      reportedSuccessCount: 0,
      mismatch: true,
      reason: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

export const shouldSkipCleanup = async (uploadIds: string[]): Promise<{ skip: boolean; reason?: string }> => {
  try {
    console.log(`🚨 Checking if cleanup should be skipped for uploads: ${uploadIds.join(', ')}`);
    
    for (const uploadId of uploadIds) {
      const validation = await validateUploadSuccess(uploadId);
      
      if (!validation.isValid) {
        console.log(`❌ Upload ${uploadId} failed validation - skipping cleanup`);
        return {
          skip: true,
          reason: validation.reason || 'Upload validation failed'
        };
      }
    }
    
    console.log(`✅ All uploads validated successfully - cleanup can proceed`);
    return { skip: false };
  } catch (error) {
    console.error('Error checking cleanup eligibility:', error);
    return {
      skip: true,
      reason: `Validation check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};
