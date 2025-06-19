
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { parseEnhancedInventoryFile } from "@/utils/enhancedFileParsingUtils";
import { storeUploadedFile, createUploadHistoryWithoutStorage, updateUploadHistory, type UploadHistoryRecord } from "@/utils/fileStorageUtils";
import { validateAndProcessInventoryRows } from "@/utils/uploadValidation";
import { mapRowToInventoryItemEnhanced } from "@/utils/enhancedInventoryMapper";
import { handleFileSelection } from "@/utils/fileUploadHandlers";
import { syncInventoryData } from "@/services/inventoryService";
import { vehicleHistoryService } from "@/services/inventory/vehicleHistoryService";
import { detectReportType } from "@/utils/reportDetection";
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
  results: Array<{
    fileName: string;
    status: 'success' | 'error';
    records?: number;
    reportType?: string;
    duplicates?: number;
    error?: string;
  }>;
}

export const useEnhancedMultiFileUpload = ({ userId }: UseEnhancedMultiFileUploadProps) => {
  const [processing, setProcessing] = useState(false);
  const [batchResult, setBatchResult] = useState<EnhancedBatchUploadResult | null>(null);
  const { toast } = useToast();

  const processFile = async (queuedFile: QueuedFile): Promise<void> => {
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
      
      // Detect report type
      const detection = detectReportType(queuedFile.file.name, parsed.headers);
      console.log('Detected report type:', detection);
      
      // Store the file
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
      
      // Enhanced validation and processing
      const validationResult = await validateAndProcessInventoryRows(
        parsed.rows,
        detection.recommendedCondition,
        uploadRecord.id,
        (row, condition, uploadId) => mapRowToInventoryItemEnhanced(
          row, 
          condition, 
          uploadId, 
          queuedFile.file.name, 
          parsed.headers
        ).item
      );

      // Record vehicle history
      const inventoryItems = parsed.rows
        .map(row => mapRowToInventoryItemEnhanced(
          row, 
          detection.recommendedCondition, 
          uploadRecord!.id, 
          queuedFile.file.name, 
          parsed.headers
        ).item)
        .filter(item => item.make !== 'Unknown' || item.vin || item.stock_number);

      if (inventoryItems.length > 0) {
        await vehicleHistoryService.recordVehicleHistory(
          inventoryItems,
          uploadRecord.id,
          detection.sourceReport
        );

        await vehicleHistoryService.upsertVehicleMasterRecords(
          inventoryItems,
          detection.sourceReport
        );
      }

      // Detect duplicates
      const duplicateResult = await vehicleHistoryService.detectDuplicates(uploadRecord.id);

      // Update upload history with enhanced results
      await updateUploadHistory(uploadRecord.id, {
        total_rows: parsed.rows.length,
        successful_imports: validationResult.successCount,
        failed_imports: validationResult.errorCount,
        processing_status: 'completed',
        error_details: validationResult.errors.length > 0 ? validationResult.errors.slice(0, 20).join('\n') : undefined,
        metadata: {
          reportType: detection.reportType,
          confidence: detection.confidence,
          duplicatesDetected: duplicateResult.duplicateCount,
          vehicleHistoryEntries: inventoryItems.length
        }
      });

      // Trigger sync for actual inventory (not preliminary data)
      const isPreliminaryData = detection.reportType === 'gm_global' || 
                                queuedFile.file.name.toLowerCase().includes('preliminary');
      
      if (!isPreliminaryData && validationResult.successCount > 0) {
        try {
          console.log(`Triggering automatic inventory sync for ${queuedFile.file.name}...`);
          await syncInventoryData(uploadRecord.id);
        } catch (syncError) {
          console.error('Automatic sync failed:', syncError);
        }
      }

      // Success notification
      const duplicateMsg = duplicateResult.duplicateCount > 0 
        ? `, ${duplicateResult.duplicateCount} duplicates detected`
        : '';
      
      toast({
        title: `${queuedFile.file.name} processed successfully`,
        description: `${validationResult.successCount} records imported (${detection.reportType})${duplicateMsg}`,
      });

    } catch (error) {
      console.error(`Enhanced upload error for ${queuedFile.file.name}:`, error);
      
      if (uploadRecord) {
        await updateUploadHistory(uploadRecord.id, {
          processing_status: 'failed',
          error_details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      throw error;
    }
  };

  const processBatch = async (files: QueuedFile[]): Promise<EnhancedBatchUploadResult> => {
    setProcessing(true);
    
    const results: EnhancedBatchUploadResult['results'] = [];
    let totalRecords = 0;
    let successfulRecords = 0;
    let failedRecords = 0;
    let successfulFiles = 0;
    let failedFiles = 0;
    let totalDuplicates = 0;
    let totalHistoryEntries = 0;

    try {
      for (const file of files) {
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

      const batchResult: EnhancedBatchUploadResult = {
        totalFiles: files.length,
        successfulFiles,
        failedFiles,
        totalRecords,
        successfulRecords,
        failedRecords,
        duplicatesDetected: totalDuplicates,
        vehicleHistoryEntries: totalHistoryEntries,
        results
      };

      setBatchResult(batchResult);

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

      return batchResult;

    } finally {
      setProcessing(false);
    }
  };

  return {
    processing,
    batchResult,
    setBatchResult,
    processFile,
    processBatch
  };
};
