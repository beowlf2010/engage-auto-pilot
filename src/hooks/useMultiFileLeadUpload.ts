
import { useState, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from '@/hooks/use-toast';
import { parseEnhancedInventoryFile } from '@/utils/enhancedFileParsingUtils';
import { parseCSV } from '@/components/upload-leads/csvParsingUtils';
import { processLeads } from '@/components/upload-leads/processLeads';
import { performAutoDetection } from '@/components/csv-mapper/fieldMappingUtils';
import { uploadLeadsWithRLSBypass } from '@/utils/leadOperations/rlsBypassUploader';

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
      sqlstate?: string;
      timestamp?: string;
    }>;
  }>;
}

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
      sqlstate?: string;
      timestamp?: string;
    }>;
  }> => {
    try {
      console.log(`📤 [MULTI UPLOAD] Processing file: ${queuedFile.file.name}`);
      
      // Update file status to processing
      setQueuedFiles(prev => prev.map(f => 
        f.id === queuedFile.id ? { ...f, status: 'processing' } : f
      ));

      // Parse the file
      let parsedData;
      try {
        if (queuedFile.file.name.toLowerCase().endsWith('.csv')) {
          console.log(`📄 [MULTI UPLOAD] Parsing CSV file: ${queuedFile.file.name}`);
          const text = await queuedFile.file.text();
          parsedData = parseCSV(text);
        } else {
          console.log(`📊 [MULTI UPLOAD] Parsing Excel file: ${queuedFile.file.name}`);
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

      // Auto-detect field mapping
      const fieldMapping = performAutoDetection(parsedData.headers);
      console.log('🔍 [MULTI UPLOAD] Auto-detected field mapping:', fieldMapping);

      // Process leads using the standard processor
      const processingResult = processLeads(parsedData, fieldMapping);
      
      console.log(`⚙️ [MULTI UPLOAD] Processing result:`, {
        validLeads: processingResult.validLeads.length,
        duplicates: processingResult.duplicates.length,
        errors: processingResult.errors.length
      });

      if (processingResult.validLeads.length === 0) {
        const errorMsg = `No valid leads found. ${processingResult.errors.length} processing errors, ${processingResult.duplicates.length} duplicates detected.`;
        console.error(`❌ [MULTI UPLOAD] ${errorMsg}`);
        throw new Error(errorMsg);
      }

      // Use ultimate bypass upload
      console.log(`💾 [MULTI UPLOAD] Using ultimate bypass upload for ${processingResult.validLeads.length} leads...`);
      const uploadResult = await uploadLeadsWithRLSBypass(processingResult.validLeads);

      console.log(`💾 [MULTI UPLOAD] Ultimate bypass upload result:`, uploadResult);

      // Enhanced error details processing
      const errorDetails = (uploadResult.errors || []).map((error: any, index: number) => ({
        rowIndex: error.rowIndex || index + 1,
        error: error.error || 'Unknown error',
        leadName: error.leadData ? 
          `${error.leadData.firstName || 'Unknown'} ${error.leadData.lastName || 'Lead'}` : 
          `Lead ${index + 1}`,
        sqlstate: error.sqlstate,
        timestamp: error.timestamp
      }));

      // Update file status to completed
      setQueuedFiles(prev => prev.map(f => 
        f.id === queuedFile.id ? { 
          ...f, 
          status: 'completed', 
          result: {
            totalRows: parsedData.rows.length,
            successfulImports: uploadResult.successfulInserts,
            errors: uploadResult.errors?.length || 0,
            duplicates: processingResult.duplicates.length,
            errorDetails
          }
        } : f
      ));

      return { 
        success: uploadResult.success && uploadResult.successfulInserts > 0,
        totalRows: parsedData.rows.length,
        successfulImports: uploadResult.successfulInserts,
        errors: uploadResult.errors?.length || 0,
        duplicates: processingResult.duplicates.length,
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
          leadName: 'File Processing Error',
          timestamp: new Date().toISOString()
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
      console.log(`🚀 [MULTI UPLOAD] Starting ultimate bypass batch processing of ${queuedFiles.length} files`);

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

      console.log(`🎉 [MULTI UPLOAD] Ultimate bypass batch processing completed:`, result);

      setBatchResult(result);
      return result;

    } catch (error) {
      console.error('❌ [MULTI UPLOAD] Ultimate bypass batch processing failed:', error);
      toast({
        title: "Ultimate Bypass Upload Failed",
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
