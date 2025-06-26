
import { useState, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from '@/hooks/use-toast';
import { parseEnhancedInventoryFile } from '@/utils/enhancedFileParsingUtils';
import { processLeadsEnhanced } from '@/components/upload-leads/enhancedProcessLeads';
import { insertLeadsToDatabase } from '@/utils/supabaseLeadOperations';
import { parseCSV } from '@/components/upload-leads/csvParsingUtils';

interface QueuedFile {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: any;
  error?: string;
}

interface BatchUploadResult {
  totalFiles: number;
  totalLeads: number;
  successfulLeads: number;
  failedLeads: number;
  duplicateLeads: number;
  results: Array<{
    fileName: string;
    status: 'success' | 'error';
    totalRows: number;
    successfulImports: number;
    errors: number;
    duplicates: number;
    errorDetails?: Array<{
      rowIndex: number;
      error: string;
      leadName?: string;
    }>;
  }>;
}

// Updated field mapping for lead files with corrected AI strategy field mappings
const DEFAULT_LEAD_MAPPING = {
  firstName: 'first_name',
  lastName: 'last_name',
  middleName: 'middle_name',
  email: 'email',
  emailAlt: 'email_alt',
  cellphone: 'cellphone',
  dayphone: 'dayphone',
  evephone: 'evephone',
  address: 'address',
  city: 'city',
  state: 'state',
  postalCode: 'postal_code',
  vehicleYear: 'vehicle_year',
  vehicleMake: 'vehicle_make',
  vehicleModel: 'vehicle_model',
  vehicleVIN: 'vehicle_vin',
  source: 'source',
  status: 'status',
  salesPersonFirstName: 'salesperson_first_name',
  salesPersonLastName: 'salesperson_last_name',
  doNotCall: 'do_not_call',
  doNotEmail: 'do_not_email',
  doNotMail: 'do_not_mail',
  // Updated AI Strategy field mappings to match actual CSV column variations
  leadStatusTypeName: 'leadstatustypename',
  leadTypeName: 'leadtypename', 
  leadSourceName: 'leadsourcename'
};

export const useMultiFileLeadUpload = () => {
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchUploadResult | null>(null);
  const [updateExistingLeads, setUpdateExistingLeads] = useState(false);
  const { profile } = useAuth();

  const addFiles = useCallback((files: FileList) => {
    const newFiles: QueuedFile[] = Array.from(files).map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      status: 'pending'
    }));

    setQueuedFiles(prev => [...prev, ...newFiles]);
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setQueuedFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const clearQueue = useCallback(() => {
    setQueuedFiles([]);
    setBatchResult(null);
  }, []);

  const processFile = async (queuedFile: QueuedFile): Promise<{
    success: boolean;
    totalRows: number;
    successfulImports: number;
    errors: number;
    duplicates: number;
    errorDetails?: Array<{
      rowIndex: number;
      error: string;
      leadName?: string;
    }>;
  }> => {
    try {
      console.log(`📤 [MULTI UPLOAD] Processing file: ${queuedFile.file.name}`);
      console.log(`📤 [MULTI UPLOAD] File details:`, {
        name: queuedFile.file.name,
        size: queuedFile.file.size,
        type: queuedFile.file.type
      });
      
      // Update file status to processing
      setQueuedFiles(prev => prev.map(f => 
        f.id === queuedFile.id ? { ...f, status: 'processing' } : f
      ));

      // Parse the file using existing enhanced parsing
      let parsedData;
      try {
        if (queuedFile.file.name.toLowerCase().endsWith('.csv')) {
          console.log(`📄 [MULTI UPLOAD] Parsing CSV file: ${queuedFile.file.name}`);
          const text = await queuedFile.file.text();
          parsedData = parseCSV(text);
        } else {
          console.log(`📊 [MULTI UPLOAD] Parsing Excel file: ${queuedFile.file.name}`);
          // For Excel files, use the enhanced parser
          parsedData = await parseEnhancedInventoryFile(queuedFile.file);
        }
      } catch (parseError) {
        console.error(`❌ [MULTI UPLOAD] File parsing failed:`, parseError);
        throw new Error(`File parsing failed: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`);
      }

      if (!parsedData || !parsedData.rows || parsedData.rows.length === 0) {
        console.error(`❌ [MULTI UPLOAD] No data found in file`);
        throw new Error('No data found in file or file is empty');
      }

      console.log(`📊 [MULTI UPLOAD] Parsed ${parsedData.rows.length} rows from ${queuedFile.file.name}`);
      console.log(`🔍 [MULTI UPLOAD] Sample CSV headers:`, parsedData.headers);
      console.log(`🔍 [MULTI UPLOAD] Sample row data:`, parsedData.sample);

      // Process leads using enhanced processing with upload history and update option
      console.log(`⚙️ [MULTI UPLOAD] Processing leads with enhanced processing...`);
      const processingResult = await processLeadsEnhanced(
        parsedData,
        DEFAULT_LEAD_MAPPING,
        queuedFile.file.name,
        queuedFile.file.size,
        queuedFile.file.type || 'application/octet-stream',
        { updateExistingLeads }
      );

      console.log(`⚙️ [MULTI UPLOAD] Processing result:`, {
        validLeads: processingResult.validLeads.length,
        duplicates: processingResult.duplicates.length,
        errors: processingResult.errors.length,
        warnings: processingResult.warnings.length
      });

      if (processingResult.validLeads.length === 0) {
        const errorMsg = `No valid leads found. ${processingResult.errors.length} processing errors, ${processingResult.duplicates.length} duplicates detected.`;
        console.error(`❌ [MULTI UPLOAD] ${errorMsg}`);
        throw new Error(errorMsg);
      }

      // Insert leads to database using existing enhanced insertion with update support
      console.log(`💾 [MULTI UPLOAD] Inserting ${processingResult.validLeads.length} leads to database...`);
      const insertResult = await insertLeadsToDatabase(
        processingResult.validLeads,
        processingResult.uploadHistoryId,
        { updateExistingLeads }
      );

      console.log(`💾 [MULTI UPLOAD] Database operation result:`, {
        successfulInserts: insertResult.successfulInserts,
        successfulUpdates: insertResult.successfulUpdates,
        errors: insertResult.errors.length,
        duplicates: insertResult.duplicates.length
      });

      // Convert insertion errors to the expected format
      const errorDetails = insertResult.errors.map(error => ({
        rowIndex: error.rowIndex,
        error: error.error,
        leadName: `${error.leadData.firstName || 'Unknown'} ${error.leadData.lastName || 'Lead'}`
      }));

      // Update file status to completed
      setQueuedFiles(prev => prev.map(f => 
        f.id === queuedFile.id ? { 
          ...f, 
          status: 'completed', 
          result: {
            totalRows: parsedData.rows.length,
            successfulImports: insertResult.successfulInserts,
            errors: insertResult.errors.length,
            duplicates: insertResult.duplicates.length + processingResult.duplicates.length,
            errorDetails
          }
        } : f
      ));

      return { 
        success: true,
        totalRows: parsedData.rows.length,
        successfulImports: insertResult.successfulInserts,
        errors: insertResult.errors.length,
        duplicates: insertResult.duplicates.length + processingResult.duplicates.length,
        errorDetails
      };

    } catch (error) {
      console.error(`❌ [MULTI UPLOAD] Error processing ${queuedFile.file.name}:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Update file status to error
      setQueuedFiles(prev => prev.map(f => 
        f.id === queuedFile.id ? { ...f, status: 'error', error: errorMessage } : f
      ));

      return { 
        success: false,
        totalRows: 0,
        successfulImports: 0,
        errors: 1,
        duplicates: 0,
        errorDetails: [{
          rowIndex: 1,
          error: errorMessage,
          leadName: 'File Processing Error'
        }]
      };
    }
  };

  const processBatch = async (): Promise<BatchUploadResult> => {
    if (queuedFiles.length === 0) {
      throw new Error('No files to process');
    }

    if (!profile) {
      throw new Error('User profile not found. Please ensure you are logged in.');
    }

    setProcessing(true);
    
    const result: BatchUploadResult = {
      totalFiles: queuedFiles.length,
      totalLeads: 0,
      successfulLeads: 0,
      failedLeads: 0,
      duplicateLeads: 0,
      results: []
    };

    try {
      console.log(`🚀 [MULTI UPLOAD] Starting batch processing of ${queuedFiles.length} files`);

      // Process files sequentially to avoid overwhelming the system
      for (const queuedFile of queuedFiles) {
        const fileResult = await processFile(queuedFile);
        
        result.totalLeads += fileResult.totalRows;
        result.successfulLeads += fileResult.successfulImports;
        result.failedLeads += fileResult.errors;
        result.duplicateLeads += fileResult.duplicates;
        
        result.results.push({
          fileName: queuedFile.file.name,
          status: fileResult.success ? 'success' : 'error',
          totalRows: fileResult.totalRows,
          successfulImports: fileResult.successfulImports,
          errors: fileResult.errors,
          duplicates: fileResult.duplicates,
          errorDetails: fileResult.errorDetails
        });

        // Add a small delay between files to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log(`🎉 [MULTI UPLOAD] Batch processing completed:`, result);

      setBatchResult(result);
      return result;

    } catch (error) {
      console.error('❌ [MULTI UPLOAD] Batch processing failed:', error);
      toast({
        title: "Batch Upload Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
      throw error;
    } finally {
      setProcessing(false);
    }
  };

  return {
    queuedFiles,
    processing,
    batchResult,
    updateExistingLeads,
    setUpdateExistingLeads,
    addFiles,
    removeFile,
    clearQueue,
    processBatch
  };
};
