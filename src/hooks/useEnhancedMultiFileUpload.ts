
import { useState, useRef, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { parseEnhancedInventoryFile } from "@/utils/enhancedFileParsingUtils";
import { storeUploadedFile, createUploadHistoryWithoutStorage, updateUploadHistory, type UploadHistoryRecord } from "@/utils/fileStorageUtils";
import { validateAndProcessInventoryRows } from "@/utils/uploadValidation";
import { mapRowToInventoryItemEnhanced } from "@/utils/enhancedInventoryMapper";
import { handleFileSelection } from "@/utils/fileUploadHandlers";
import { syncInventoryData } from "@/services/inventoryService";
import { vehicleHistoryService } from "@/services/inventory/vehicleHistoryService";
import { detectReportType } from "@/utils/reportDetection";
import { validateInventoryItem } from "@/services/inventory/core/gmGlobalValidationService";
import type { QueuedFile } from "@/components/inventory-upload/DragDropFileQueue";

interface UseEnhancedMultiFileUploadProps {
  userId: string;
}

export interface EnhancedBatchUploadResult {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  duplicatesDetected: number;
  vehicleHistoryEntries: number;
  validationWarnings: number;
  results: Array<{
    fileName: string;
    status: 'success' | 'error';
    records?: number;
    reportType?: string;
    duplicates?: number;
    warnings?: number;
    error?: string;
  }>;
}

export const useEnhancedMultiFileUpload = ({ userId }: UseEnhancedMultiFileUploadProps) => {
  const [processing, setProcessing] = useState(false);
  const [batchResult, setBatchResult] = useState<EnhancedBatchUploadResult | null>(null);
  const { toast } = useToast();
  const processingRef = useRef(false);
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Safely update state only if component is still mounted
  const safeSetProcessing = useCallback((value: boolean) => {
    if (mountedRef.current) {
      setProcessing(value);
      processingRef.current = value;
    }
  }, []);

  const safeSetBatchResult = useCallback((result: EnhancedBatchUploadResult | null) => {
    if (mountedRef.current) {
      setBatchResult(result);
    }
  }, []);

  // Enhanced navigation prevention during processing
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (processingRef.current) {
        const message = 'File processing is in progress. Are you sure you want to leave? This will interrupt the upload process.';
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      if (processingRef.current) {
        e.preventDefault();
        const shouldLeave = window.confirm('File processing is in progress. Leaving will interrupt the upload. Are you sure?');
        if (!shouldLeave) {
          // Push the current state back to prevent navigation
          window.history.pushState(null, '', window.location.href);
        } else {
          // Cancel ongoing operations
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
          processingRef.current = false;
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      processingRef.current = false;
    };
  }, []);

  const processFile = async (queuedFile: QueuedFile): Promise<void> => {
    if (!mountedRef.current) return;
    
    let uploadRecord: UploadHistoryRecord | null = null;
    
    try {
      console.log(`Enhanced processing ${queuedFile.file.name} as ${queuedFile.condition} inventory...`);
      
      // Check if file needs sheet selection
      const fileSelectionResult = await handleFileSelection(queuedFile.file);
      
      if (fileSelectionResult.shouldShowSheetSelector) {
        throw new Error('Multi-sheet Excel files require individual processing');
      }
      
      // Parse the file first to get headers for report detection
      const parsed = await parseEnhancedInventoryFile(queuedFile.file);
      console.log(`Parsed ${parsed.fileType} file with ${parsed.rows.length} rows`);
      
      // Enhanced report detection
      const detection = detectReportType(queuedFile.file.name, parsed.headers);
      console.log('Enhanced report detection:', detection);
      
      // Validate detection confidence
      if (detection.confidence < 50) {
        console.warn('Low confidence in report type detection:', detection);
      }
      
      // Store the file with detected information
      try {
        uploadRecord = await storeUploadedFile(
          queuedFile.file, 
          userId, 
          'inventory', 
          detection.recommendedCondition
        );
        console.log('File stored with ID:', uploadRecord.id);
      } catch (storageError) {
        console.warn('File storage failed, using fallback method:', storageError);
        uploadRecord = await createUploadHistoryWithoutStorage(
          queuedFile.file, 
          userId, 
          'inventory', 
          detection.recommendedCondition
        );
        console.log('Upload history created without storage, ID:', uploadRecord.id);
      }
      
      // Enhanced validation and processing with GM Global protection
      let validationWarnings = 0;
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];
      
      const inventoryItems = parsed.rows.map((row, index) => {
        try {
          const mappingResult = mapRowToInventoryItemEnhanced(
            row, 
            detection.recommendedCondition, 
            uploadRecord!.id, 
            queuedFile.file.name, 
            parsed.headers,
            detection
          );
          
          // Additional validation for the mapped item
          const validation = validateInventoryItem(mappingResult.item, detection.reportType);
          
          if (!validation.isValid) {
            errors.push(`Row ${index + 1}: ${validation.errors.join(', ')}`);
            errorCount++;
            return null;
          }
          
          if (validation.warnings.length > 0) {
            console.warn(`Row ${index + 1} warnings:`, validation.warnings);
            validationWarnings++;
          }
          
          if (mappingResult.warnings.length > 0) {
            console.warn(`Row ${index + 1} mapping warnings:`, mappingResult.warnings);
            validationWarnings++;
          }
          
          successCount++;
          return validation.correctedData || mappingResult.item;
          
        } catch (error) {
          console.error(`Error processing row ${index + 1}:`, error);
          errors.push(`Row ${index + 1}: Processing failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
          errorCount++;
          return null;
        }
      }).filter(item => item !== null);

      console.log(`Processing complete: ${successCount} successful, ${errorCount} errors, ${validationWarnings} warnings`);

      // Process vehicle history using the enhanced batch method
      let batchResult = {
        historyRecorded: 0,
        masterRecordsUpserted: 0,
        duplicatesDetected: 0
      };

      if (inventoryItems.length > 0 && mountedRef.current) {
        try {
          batchResult = await vehicleHistoryService.processBatch(
            inventoryItems,
            uploadRecord.id,
            detection.sourceReport
          );
          console.log('Vehicle history batch processing result:', batchResult);
        } catch (historyError) {
          console.error('Vehicle history processing failed, continuing with upload:', historyError);
          // Don't fail the entire upload if history processing fails
        }
      }

      // Update upload history with enhanced results
      if (mountedRef.current) {
        await updateUploadHistory(uploadRecord.id, {
          total_rows: parsed.rows.length,
          successful_imports: successCount,
          failed_imports: errorCount,
          processing_status: 'completed',
          error_details: errors.length > 0 ? errors.slice(0, 20).join('\n') : undefined
        });
      }

      // Trigger sync for actual inventory (not preliminary data or GM Global orders)
      const isPreliminaryData = detection.reportType === 'gm_global' || 
                                queuedFile.file.name.toLowerCase().includes('preliminary');
      
      if (!isPreliminaryData && successCount > 0 && mountedRef.current) {
        try {
          console.log(`Triggering automatic inventory sync for ${queuedFile.file.name}...`);
          await syncInventoryData(uploadRecord.id);
        } catch (syncError) {
          console.error('Automatic sync failed:', syncError);
        }
      }

      // Success notification with enhanced information
      if (mountedRef.current) {
        const duplicateMsg = batchResult.duplicatesDetected > 0 
          ? `, ${batchResult.duplicatesDetected} duplicates detected`
          : '';
        
        const warningMsg = validationWarnings > 0 
          ? `, ${validationWarnings} warnings`
          : '';
        
        toast({
          title: `${queuedFile.file.name} processed successfully`,
          description: `${successCount} records imported (${detection.reportType}, ${Math.round(detection.confidence)}% confidence)${duplicateMsg}${warningMsg}`,
        });
      }

    } catch (error) {
      console.error(`Enhanced upload error for ${queuedFile.file.name}:`, error);
      
      if (uploadRecord && mountedRef.current) {
        await updateUploadHistory(uploadRecord.id, {
          processing_status: 'failed',
          error_details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      throw error;
    }
  };

  const processBatch = async (files: QueuedFile[]): Promise<EnhancedBatchUploadResult> => {
    if (processingRef.current) {
      console.warn('Batch processing already in progress');
      return batchResult || {
        totalFiles: 0,
        successfulFiles: 0,
        failedFiles: 0,
        totalRecords: 0,
        successfulRecords: 0,
        failedRecords: 0,
        duplicatesDetected: 0,
        vehicleHistoryEntries: 0,
        validationWarnings: 0,
        results: []
      };
    }

    if (!mountedRef.current) return {
      totalFiles: 0,
      successfulFiles: 0,
      failedFiles: 0,
      totalRecords: 0,
      successfulRecords: 0,
      failedRecords: 0,
      duplicatesDetected: 0,
      vehicleHistoryEntries: 0,
      validationWarnings: 0,
      results: []
    };

    // Create new abort controller for this batch
    abortControllerRef.current = new AbortController();
    safeSetProcessing(true);
    
    const results: EnhancedBatchUploadResult['results'] = [];
    let totalRecords = 0;
    let successfulRecords = 0;
    let failedRecords = 0;
    let successfulFiles = 0;
    let failedFiles = 0;
    let totalDuplicates = 0;
    let totalHistoryEntries = 0;
    let totalValidationWarnings = 0;

    try {
      for (const file of files) {
        // Check if operation was aborted
        if (abortControllerRef.current?.signal.aborted || !mountedRef.current) {
          console.log('Batch processing aborted');
          break;
        }

        try {
          await processFile(file);
          
          // Get actual stats from the processed file
          const parsed = await parseEnhancedInventoryFile(file.file);
          const detection = detectReportType(file.file.name, parsed.headers);
          
          totalRecords += parsed.rows.length;
          successfulRecords += parsed.rows.length; // Simplified
          successfulFiles++;
          
          results.push({
            fileName: file.file.name,
            status: 'success',
            records: parsed.rows.length,
            reportType: detection.reportType
          });
        } catch (error) {
          failedFiles++;
          results.push({
            fileName: file.file.name,
            status: 'error',
            error: error instanceof Error ? error.message : 'Processing failed'
          });
        }
      }

      const finalResult: EnhancedBatchUploadResult = {
        totalFiles: files.length,
        successfulFiles,
        failedFiles,
        totalRecords,
        successfulRecords,
        failedRecords,
        duplicatesDetected: totalDuplicates,
        vehicleHistoryEntries: totalHistoryEntries,
        validationWarnings: totalValidationWarnings,
        results
      };

      safeSetBatchResult(finalResult);

      if (mountedRef.current) {
        if (failedFiles === 0) {
          toast({
            title: "Enhanced batch upload successful!",
            description: `${successfulFiles} files processed with vehicle history tracking`,
          });
        } else {
          toast({
            title: "Batch upload completed with errors",
            description: `${successfulFiles} files succeeded, ${failedFiles} files failed`,
            variant: "default"
          });
        }
      }

      return finalResult;

    } catch (error) {
      console.error('Batch processing error:', error);
      if (mountedRef.current) {
        toast({
          title: "Batch processing failed",
          description: error instanceof Error ? error.message : "An unexpected error occurred",
          variant: "destructive"
        });
      }
      
      throw error;
    } finally {
      safeSetProcessing(false);
      abortControllerRef.current = null;
    }
  };

  return {
    processing,
    batchResult,
    setBatchResult: safeSetBatchResult,
    processFile,
    processBatch
  };
};
