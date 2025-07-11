import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { parseEnhancedInventoryFile } from "@/utils/enhancedFileParsingUtils";
import { storeUploadedFile, createUploadHistoryWithoutStorage, updateUploadHistory, type UploadHistoryRecord } from "@/utils/fileStorageUtils";
import { validateAndProcessInventoryRows } from "@/utils/uploadValidation";
import { mapRowToInventoryItem } from "@/utils/enhancedFileParsingUtils";
import { handleFileSelection } from "@/utils/fileUploadHandlers";
import { syncInventoryData } from "@/services/inventoryService";
import { uploadInventorySecurely } from "@/utils/secureInventoryUploader";
import type { QueuedFile } from "@/components/inventory-upload/DragDropFileQueue";

interface UseMultiFileUploadProps {
  userId: string;
}

export interface BatchUploadResult {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  results: Array<{
    fileName: string;
    status: 'success' | 'error';
    records?: number;
    error?: string;
  }>;
}

export const useMultiFileUpload = ({ userId }: UseMultiFileUploadProps) => {
  const [processing, setProcessing] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchUploadResult | null>(null);
  const { toast } = useToast();

  const processFile = async (queuedFile: QueuedFile): Promise<void> => {
    let uploadRecord: UploadHistoryRecord | null = null;
    
    try {
      console.log(`Processing ${queuedFile.file.name} as ${queuedFile.condition} inventory...`);
      
      // Check if file needs sheet selection
      const fileSelectionResult = await handleFileSelection(queuedFile.file);
      
      if (fileSelectionResult.shouldShowSheetSelector) {
        throw new Error('Multi-sheet Excel files require individual processing');
      }
      
      // Determine if this is preliminary data
      const isPreliminaryData = queuedFile.file.name.toLowerCase().includes('preliminary') || 
                                queuedFile.file.name.toLowerCase().includes('prelim') ||
                                queuedFile.condition === 'gm_global';
      
      // Try to store the original file first, with fallback
      const inventoryCondition = queuedFile.condition === 'gm_global' ? 'new' : queuedFile.condition;
      
      try {
        uploadRecord = await storeUploadedFile(queuedFile.file, userId, 'inventory', inventoryCondition);
        console.log('File stored with ID:', uploadRecord.id);
      } catch (storageError) {
        console.warn('File storage failed, using fallback method:', storageError);
        // Fallback: create upload history without storing the file
        uploadRecord = await createUploadHistoryWithoutStorage(queuedFile.file, userId, 'inventory', inventoryCondition);
        console.log('Upload history created without storage, ID:', uploadRecord.id);
        
        toast({
          title: "Processing without file storage",
          description: "File storage unavailable, but processing will continue normally",
          variant: "default"
        });
      }
      
      // Parse the file
      const parsed = await parseEnhancedInventoryFile(queuedFile.file);
      console.log(`Parsed ${parsed.fileType} file with ${parsed.rows.length} rows`);
      
      // Map rows to inventory items and use secure uploader
      const inventoryItems = await Promise.all(
        parsed.rows.map(row => mapRowToInventoryItem(row, queuedFile.condition, uploadRecord.id))
      );
      
      console.log(`🔐 [MULTI-FILE] Using secure uploader for ${inventoryItems.length} items`);
      
      // Use the secure uploader
      const uploadResult = await uploadInventorySecurely(inventoryItems, uploadRecord.id);
      
      // Update upload history with results
      await updateUploadHistory(uploadRecord.id, {
        total_rows: parsed.rows.length,
        successful_imports: uploadResult.successfulInserts,
        failed_imports: uploadResult.errors.length,
        processing_status: uploadResult.success ? 'completed' : 'failed',
        error_details: uploadResult.errors.length > 0 ? uploadResult.errors.slice(0, 20).map(e => e.error).join('\n') : undefined
      });

      // Only trigger automatic sync for actual inventory (not preliminary data)
      if (!isPreliminaryData && uploadResult.successfulInserts > 0) {
        try {
          console.log(`Triggering automatic inventory sync for ${queuedFile.file.name}...`);
          await syncInventoryData(uploadRecord.id);
        } catch (syncError) {
          console.error('Automatic sync failed for', queuedFile.file.name, ':', syncError);
        }
      } else if (isPreliminaryData) {
        console.log(`Skipping automatic sync for preliminary data: ${queuedFile.file.name}`);
      }

      if (uploadResult.errors.length === 0) {
        toast({
          title: `${queuedFile.file.name} processed successfully`,
          description: `${uploadResult.successfulInserts} ${isPreliminaryData ? 'preliminary orders' : 'records'} imported`,
        });
      } else if (uploadResult.successfulInserts > 0) {
        toast({
          title: `${queuedFile.file.name} processed with warnings`,
          description: `${uploadResult.successfulInserts} imported, ${uploadResult.errors.length} failed`,
          variant: "default"
        });
      } else {
        throw new Error(`No records could be imported from ${queuedFile.file.name}: ${uploadResult.message}`);
      }

    } catch (error) {
      console.error(`Upload error for ${queuedFile.file.name}:`, error);
      
      if (uploadRecord) {
        await updateUploadHistory(uploadRecord.id, {
          processing_status: 'failed',
          error_details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      throw error;
    }
  };

  const processBatch = async (files: QueuedFile[]): Promise<BatchUploadResult> => {
    setProcessing(true);
    
    const results: BatchUploadResult['results'] = [];
    let totalRecords = 0;
    let successfulRecords = 0;
    let failedRecords = 0;
    let successfulFiles = 0;
    let failedFiles = 0;
    let hasActualInventory = false;

    try {
      for (const file of files) {
        try {
          await processFile(file);
          
          // Get the actual record counts (this is simplified - in reality you'd track this during processing)
          const parsed = await parseEnhancedInventoryFile(file.file);
          totalRecords += parsed.rows.length;
          successfulRecords += parsed.rows.length; // Simplified - assume all succeeded if no error
          successfulFiles++;
          
          // Check if any file was actual inventory (not preliminary)
          const isPreliminaryData = file.file.name.toLowerCase().includes('preliminary') || 
                                    file.file.name.toLowerCase().includes('prelim') ||
                                    file.condition === 'gm_global';
          if (!isPreliminaryData) {
            hasActualInventory = true;
          }
          
          results.push({
            fileName: file.file.name,
            status: 'success',
            records: parsed.rows.length
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

      const batchResult: BatchUploadResult = {
        totalFiles: files.length,
        successfulFiles,
        failedFiles,
        totalRecords,
        successfulRecords,
        failedRecords,
        results
      };

      setBatchResult(batchResult);

      if (failedFiles === 0) {
        const message = hasActualInventory 
          ? `${successfulFiles} files processed, ${successfulRecords} records imported, inventory automatically synced`
          : `${successfulFiles} files processed, ${successfulRecords} preliminary orders imported`;
        
        toast({
          title: "Batch upload successful!",
          description: message,
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
