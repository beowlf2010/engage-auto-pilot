
import { useToast } from "@/hooks/use-toast";
import { parseEnhancedInventoryFile, mapRowToInventoryItem } from "@/utils/enhancedFileParsingUtils";
import { storeUploadedFile, updateUploadHistory, type UploadHistoryRecord } from "@/utils/fileStorageUtils";
import { validateAndProcessInventoryRows } from "@/utils/uploadValidation";
import { handleFileSelection } from "@/utils/fileUploadHandlers";
import { useUploadState, type UploadResult } from "@/hooks/useUploadState";
import { supabase } from "@/integrations/supabase/client";
import { performInventoryAutoDetection, validateInventoryMapping } from "@/components/inventory-mapper/inventoryFieldUtils";

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
    setPendingFile,
    showFieldMapper,
    setShowFieldMapper,
    csvHeaders,
    setCsvHeaders,
    sampleData,
    setSampleData,
    selectedSheet,
    setSelectedSheet
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
        // Parse the file to check if field mapping is needed
        await checkAndProcessFile(file, condition);
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

  const checkAndProcessFile = async (file: File, condition: 'new' | 'used' | 'gm_global', selectedSheet?: string) => {
    try {
      // Parse the file first to get headers and sample data
      const parsed = await parseEnhancedInventoryFile(file, selectedSheet);
      console.log('🔍 [FIELD MAPPING CHECK] Parsed file:', {
        headers: parsed.headers,
        formatType: parsed.formatType,
        sampleKeys: Object.keys(parsed.sample)
      });

      // Try auto-detection
      const autoMapping = performInventoryAutoDetection(parsed.headers);
      const { isValid, errors } = validateInventoryMapping(autoMapping);
      
      console.log('🔍 [FIELD MAPPING CHECK] Auto-detection result:', {
        mapping: autoMapping,
        isValid,
        errors,
        mappedFieldsCount: Object.values(autoMapping).filter(v => v).length
      });

      // Improved auto-detection logic
      const hasVehicleInfo = !!(autoMapping.vehicle || (autoMapping.year && autoMapping.make && autoMapping.model));
      const hasIdentifier = !!(autoMapping.stockNumber || autoMapping.vin);
      const mappedFieldsCount = Object.values(autoMapping).filter(v => v).length;
      const mappingCoverage = mappedFieldsCount / parsed.headers.length;
      
      console.log('🔍 [FIELD MAPPING CHECK] Auto-detection analysis:', {
        hasVehicleInfo,
        hasIdentifier,
        mappedFieldsCount,
        totalHeaders: parsed.headers.length,
        mappingCoverage
      });

      // Show field mapper if:
      // 1. No vehicle information detected, OR
      // 2. No identifiers detected, OR  
      // 3. Very low mapping coverage (less than 20% of fields mapped)
      const shouldShowFieldMapper = (
        !hasVehicleInfo || 
        !hasIdentifier || 
        (mappedFieldsCount < 3) ||
        (mappingCoverage < 0.2 && parsed.headers.length > 5)
      );

      if (shouldShowFieldMapper) {
        console.log('🔍 [FIELD MAPPING CHECK] Auto-detection insufficient, showing field mapper');
        // Store the parsed data for the field mapper
        setCsvHeaders(parsed.headers);
        setSampleData(parsed.sample);
        setSelectedSheet(selectedSheet);
        setShowFieldMapper(true);
        return;
      }

      // Auto-detection was sufficient, proceed with processing
      console.log('✅ [FIELD MAPPING CHECK] Auto-detection sufficient, proceeding with upload');
      await processFile(file, condition, selectedSheet);

    } catch (error) {
      console.error('Error checking file for field mapping:', error);
      toast({
        title: "Error analyzing file",
        description: "Could not analyze the file structure. Please try again.",
        variant: "destructive"
      });
    }
  };

  const processFile = async (file: File, condition: 'new' | 'used' | 'gm_global', selectedSheet?: string, transformer?: (row: Record<string, any>) => Record<string, any>) => {
    setUploading(true);
    let uploadRecord: UploadHistoryRecord | null = null;
    
    try {
      console.log(`Processing ${file.name} as ${condition} inventory...`);
      
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
      
      // Apply custom transformer if provided (from field mapping)
      let processedRows = parsed.rows;
      if (transformer) {
        console.log('🔄 [INVENTORY UPLOAD] Applying custom field transformer');
        processedRows = parsed.rows.map(transformer);
      }
      
      // Enhanced logging for GM Global files
      if (condition === 'gm_global') {
        console.log('GM Global file detected - checking for order data:');
        const sampleKeys = Object.keys(parsed.sample);
        const gmFields = sampleKeys.filter(key => 
          key.toLowerCase().includes('order') ||
          key.toLowerCase().includes('delivery') ||
          key.toLowerCase().includes('customer') ||
          key.toLowerCase().includes('gm ')
        );
        console.log('Detected GM Global fields:', gmFields);
      }
      
      // Validate and process all rows with user context
      const validationResult = await validateAndProcessInventoryRows(
        processedRows,
        condition,
        uploadRecord.id,
        mapRowToInventoryItem,
        userId
      );

      // Update upload history with results
      await updateUploadHistory(uploadRecord.id, {
        total_rows: parsed.rows.length,
        successful_imports: validationResult.successCount,
        failed_imports: validationResult.errorCount,
        processing_status: 'completed',
        error_details: validationResult.errors.length > 0 ? validationResult.errors.slice(0, 20).join('\n') : undefined
      });

      // Post-upload processing
      if (condition === 'gm_global') {
        try {
          const { error } = await supabase.rpc('calculate_delivery_variance');
          if (error) throw error;
          console.log('Updated delivery variances for GM Global orders');
        } catch (error) {
          console.error('Failed to update delivery variances:', error);
        }
      }

      // CRITICAL: Check if vehicles were actually inserted and trigger cleanup if successful
      if (validationResult.successCount > 0 && validationResult.insertedVehicleIds.length > 0) {
        console.log(`✅ Upload successful with ${validationResult.insertedVehicleIds.length} vehicles actually inserted`);
        
        // Import and trigger automatic cleanup after a brief delay
        const triggerCleanup = async () => {
          try {
            await import('@/services/inventory/core/inventoryCleanupService').then(module => {
              console.log('🧹 Triggering automatic inventory cleanup after successful upload...');
              return module.cleanupInventoryData();
            });
          } catch (error) {
            console.error('Error during automatic cleanup:', error);
          }
        };
        
        // Trigger cleanup after 3 seconds to ensure upload is fully complete
        setTimeout(triggerCleanup, 3000);
      } else {
        console.warn(`⚠️ Upload insertion may have failed: reported ${validationResult.successCount} successes but ${validationResult.insertedVehicleIds.length} vehicles actually inserted`);
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

      const conditionLabel = condition === 'gm_global' ? 'GM Global Orders' : condition;
      if (validationResult.errorCount === 0) {
        toast({
          title: "Upload successful!",
          description: `${validationResult.successCount} ${conditionLabel.toLowerCase()} imported successfully. Vehicles remain available until financial data marks them as sold.`,
        });
      } else if (validationResult.successCount > 0) {
        toast({
          title: "Upload completed with errors",
          description: `${validationResult.successCount} ${conditionLabel.toLowerCase()} imported, ${validationResult.errorCount} failed. Check details below.`,
          variant: "default"
        });
      } else {
        toast({
          title: "Upload failed",
          description: `No ${conditionLabel.toLowerCase()} could be imported. Check the console for detailed field mapping information.`,
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
      setSelectedSheet(sheetName);
      setShowSheetSelector(false);
      checkAndProcessFile(pendingFile, selectedCondition, sheetName);
    }
  };

  const handleFieldMappingComplete = (mapping: any, transformer: (row: Record<string, any>) => Record<string, any>) => {
    if (pendingFile) {
      console.log('🎯 [FIELD MAPPING] Mapping completed, proceeding with upload');
      setShowFieldMapper(false);
      processFile(pendingFile, selectedCondition, selectedSheet, transformer);
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
    handleSheetSelected,
    processFile,
    // Field mapping integration
    showFieldMapper,
    setShowFieldMapper,
    csvHeaders,
    sampleData,
    handleFieldMappingComplete
  };
};
