
import { useToast } from "@/hooks/use-toast";
import { parseEnhancedInventoryFile, mapRowToInventoryItem } from "@/utils/enhancedFileParsingUtils";
import { storeUploadedFile, updateUploadHistory, type UploadHistoryRecord } from "@/utils/fileStorageUtils";
import { validateAndProcessInventoryRows } from "@/utils/uploadValidation";
import { handleFileSelection } from "@/utils/fileUploadHandlers";
import { useUploadState, type UploadResult } from "@/hooks/useUploadState";
import { syncInventoryData } from "@/services/inventoryService";

interface UseInventoryUploadProps {
  userId: string;
}

export const useInventoryUpload = ({ userId }: UseInventoryUploadProps) => {
  const {
    uploading,
    setUploading,
    uploadResult,
    setUploadResult,
    selectedCondition,
    setSelectedCondition,
    showHistory,
    setShowHistory,
    showSheetSelector,
    setShowSheetSelector,
    sheetsInfo,
    setSheetsInfo,
    pendingFile,
    setPendingFile
  } = useUploadState();

  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, condition: 'new' | 'used' | 'gm_global') => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await handleFileSelection(file);
      
      setSelectedCondition(condition);
      setPendingFile(file);

      if (result.shouldShowSheetSelector && result.sheets) {
        setSheetsInfo(result.sheets);
        setShowSheetSelector(true);
        return;
      }

      if (result.shouldProcess) {
        await processFile(file, condition);
      }
    } catch (error) {
      toast({
        title: "Invalid file format",
        description: error instanceof Error ? error.message : "Error processing file",
        variant: "destructive"
      });
    }
    
    // Reset the input
    event.target.value = '';
  };

  const processFile = async (file: File, condition: 'new' | 'used' | 'gm_global', selectedSheet?: string) => {
    setUploading(true);
    let uploadRecord: UploadHistoryRecord | null = null;
    
    try {
      console.log(`Processing ${file.name} as ${condition} inventory...`);
      
      // Determine if this is preliminary data based on filename or condition
      const isPreliminaryData = file.name.toLowerCase().includes('preliminary') || 
                                file.name.toLowerCase().includes('prelim') ||
                                condition === 'gm_global';
      
      // Store the original file first - map gm_global to inventory type
      const inventoryCondition = condition === 'gm_global' ? 'new' : condition;
      uploadRecord = await storeUploadedFile(file, userId, 'inventory', inventoryCondition);
      console.log('File stored with ID:', uploadRecord.id);
      
      // Parse the file with enhanced parsing
      const parsed = await parseEnhancedInventoryFile(file, selectedSheet);
      console.log(`Parsed ${parsed.fileType} file with ${parsed.rows.length} rows, format: ${parsed.formatType}`);
      console.log('Headers found:', parsed.headers);
      console.log('Sample row keys:', Object.keys(parsed.sample));
      console.log('Sample row data:', parsed.sample);
      
      // Validate and process all rows
      const validationResult = await validateAndProcessInventoryRows(
        parsed.rows,
        condition,
        uploadRecord.id,
        mapRowToInventoryItem
      );

      // Update upload history with results
      await updateUploadHistory(uploadRecord.id, {
        total_rows: parsed.rows.length,
        successful_imports: validationResult.successCount,
        failed_imports: validationResult.errorCount,
        processing_status: 'completed',
        error_details: validationResult.errors.length > 0 ? validationResult.errors.slice(0, 20).join('\n') : undefined
      });

      // Only trigger automatic sync for actual inventory (not preliminary data)
      if (!isPreliminaryData && validationResult.successCount > 0) {
        try {
          console.log('Triggering automatic inventory sync for actual inventory upload...');
          await syncInventoryData(uploadRecord.id);
          toast({
            title: "Inventory synced automatically",
            description: "Previous inventory has been updated based on this upload",
          });
        } catch (syncError) {
          console.error('Automatic sync failed:', syncError);
          toast({
            title: "Upload successful, sync failed",
            description: "Upload completed but automatic inventory sync failed. You may need to run cleanup manually.",
            variant: "default"
          });
        }
      } else if (isPreliminaryData) {
        console.log('Skipping automatic sync for preliminary data upload');
        toast({
          title: "Preliminary data uploaded",
          description: "Preliminary orders uploaded successfully. No inventory cleanup performed.",
        });
      }

      setUploadResult({
        total: parsed.rows.length,
        success: validationResult.successCount,
        errors: validationResult.errorCount,
        errorDetails: validationResult.errors.slice(0, 10),
        fileType: parsed.fileType,
        fileName: file.name,
        condition: condition,
        formatType: parsed.formatType,
        uploadId: uploadRecord.id,
        status: validationResult.errorCount === 0 ? 'success' : 'partial'
      });

      const conditionLabel = condition === 'gm_global' ? 'GM Global' : condition;
      if (validationResult.errorCount === 0) {
        toast({
          title: "Upload successful!",
          description: `${validationResult.successCount} ${conditionLabel} ${isPreliminaryData ? 'preliminary orders' : 'vehicles'} imported successfully`,
        });
      } else if (validationResult.successCount > 0) {
        toast({
          title: "Upload completed with errors",
          description: `${validationResult.successCount} ${isPreliminaryData ? 'orders' : 'vehicles'} imported, ${validationResult.errorCount} failed. Check details below.`,
          variant: "default"
        });
      } else {
        toast({
          title: "Upload failed",
          description: `No ${isPreliminaryData ? 'orders' : 'vehicles'} could be imported. Check the console for detailed field mapping information.`,
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Upload error:', error);
      
      // Update upload history with error
      if (uploadRecord) {
        await updateUploadHistory(uploadRecord.id, {
          processing_status: 'failed',
          error_details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Error processing the file",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setPendingFile(null);
      setShowSheetSelector(false);
    }
  };

  const handleSheetSelected = (sheetName: string) => {
    if (pendingFile) {
      processFile(pendingFile, selectedCondition, sheetName);
    }
  };

  return {
    uploading,
    uploadResult,
    selectedCondition,
    showHistory,
    setShowHistory,
    showSheetSelector,
    setShowSheetSelector,
    sheetsInfo,
    pendingFile,
    handleFileUpload,
    handleSheetSelected
  };
};
