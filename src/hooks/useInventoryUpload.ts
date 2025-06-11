
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { parseEnhancedInventoryFile, mapRowToInventoryItem, getSheetInfo, type SheetInfo } from "@/utils/enhancedFileParsingUtils";
import { storeUploadedFile, updateUploadHistory, type UploadHistoryRecord } from "@/utils/fileStorageUtils";

interface UseInventoryUploadProps {
  userId: string;
}

export const useInventoryUpload = ({ userId }: UseInventoryUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [selectedCondition, setSelectedCondition] = useState<'new' | 'used' | 'certified'>('used');
  const [showHistory, setShowHistory] = useState(false);
  const [showSheetSelector, setShowSheetSelector] = useState(false);
  const [sheetsInfo, setSheetsInfo] = useState<SheetInfo[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, condition: 'new' | 'used' | 'certified') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      toast({
        title: "Invalid file format",
        description: "Please upload a CSV or Excel file (.csv, .xlsx, .xls)",
        variant: "destructive"
      });
      return;
    }

    setSelectedCondition(condition);
    setPendingFile(file);

    // Check if it's an Excel file with multiple sheets
    if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      try {
        const sheets = await getSheetInfo(file);
        if (sheets.length > 1) {
          setSheetsInfo(sheets);
          setShowSheetSelector(true);
          return;
        }
      } catch (error) {
        console.error('Error getting sheet info:', error);
      }
    }

    // Process single sheet or CSV file
    await processFile(file, condition);
    
    // Reset the input
    event.target.value = '';
  };

  const processFile = async (file: File, condition: 'new' | 'used' | 'certified', selectedSheet?: string) => {
    setUploading(true);
    let uploadRecord: UploadHistoryRecord | null = null;
    
    try {
      console.log(`Processing ${file.name} as ${condition} inventory...`);
      
      // Store the original file first
      uploadRecord = await storeUploadedFile(file, userId, 'inventory', condition);
      console.log('File stored with ID:', uploadRecord.id);
      
      // Parse the file with enhanced parsing
      const parsed = await parseEnhancedInventoryFile(file, selectedSheet);
      console.log(`Parsed ${parsed.fileType} file with ${parsed.rows.length} rows, format: ${parsed.formatType}`);
      console.log('Sample row keys:', Object.keys(parsed.sample));
      console.log('Sample row data:', parsed.sample);
      
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < parsed.rows.length; i++) {
        const row = parsed.rows[i];
        try {
          // Use enhanced mapping function
          const inventoryItem = mapRowToInventoryItem(row, condition, uploadRecord.id);
          console.log(`Row ${i + 1} mapped item:`, { vin: inventoryItem.vin, make: inventoryItem.make, model: inventoryItem.model });

          // Validate required fields with more detailed error messages
          if (!inventoryItem.vin || inventoryItem.vin.length < 10) {
            errors.push(`Row ${i + 1}: Invalid or missing VIN "${inventoryItem.vin}" (VIN must be at least 10 characters)`);
            errorCount++;
            continue;
          }

          if (!inventoryItem.make || inventoryItem.make.length < 1) {
            errors.push(`Row ${i + 1}: Missing Make field. Available fields in this row: ${Object.keys(row).join(', ')}`);
            errorCount++;
            continue;
          }

          if (!inventoryItem.model || inventoryItem.model.length < 1) {
            errors.push(`Row ${i + 1}: Missing Model field. Available fields in this row: ${Object.keys(row).join(', ')}`);
            errorCount++;
            continue;
          }

          // Upsert inventory item
          const { error } = await supabase
            .from('inventory')
            .upsert(inventoryItem, {
              onConflict: 'vin'
            });

          if (error) {
            errors.push(`Row ${i + 1}: Database error for VIN ${inventoryItem.vin}: ${error.message}`);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (error) {
          errors.push(`Row ${i + 1}: Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          errorCount++;
        }
      }

      // Update upload history with results
      await updateUploadHistory(uploadRecord.id, {
        total_rows: parsed.rows.length,
        successful_imports: successCount,
        failed_imports: errorCount,
        processing_status: 'completed',
        error_details: errors.length > 0 ? errors.slice(0, 20).join('\n') : undefined
      });

      setUploadResult({
        total: parsed.rows.length,
        success: successCount,
        errors: errorCount,
        errorDetails: errors.slice(0, 10),
        fileType: parsed.fileType,
        fileName: file.name,
        condition: condition,
        formatType: parsed.formatType,
        uploadId: uploadRecord.id,
        status: errorCount === 0 ? 'success' : 'partial'
      });

      if (errorCount === 0) {
        toast({
          title: "Upload successful!",
          description: `${successCount} ${condition} vehicles imported successfully`,
        });
      } else if (successCount > 0) {
        toast({
          title: "Upload completed with errors",
          description: `${successCount} vehicles imported, ${errorCount} failed. Check details below.`,
          variant: "default"
        });
      } else {
        toast({
          title: "Upload failed",
          description: `No vehicles could be imported. Please check your file format.`,
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
