
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { parseFinancialFile } from "@/utils/financialFileParser";
import { insertFinancialData } from "@/utils/financialDataOperations";
import { supabase } from "@/integrations/supabase/client";

interface UploadResult {
  status: 'success' | 'error';
  message: string;
  dealsProcessed?: number;
  summary?: any;
  reportDate?: string;
  preservedDealTypes?: number;
  dealsWithInventoryLink?: number;
  dealsWithoutInventoryLink?: number;
  missingFromInventory?: number;
  missingStockNumbers?: string[];
}

export const useFinancialUpload = (userId: string) => {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      toast({
        title: "Invalid file format",
        description: "Please upload an Excel file (.xlsx or .xls)",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      console.log('Starting financial file upload:', file.name);
      
      // Parse the financial file
      const { deals, summary, fileName } = await parseFinancialFile(file);

      if (deals.length === 0) {
        throw new Error('No valid deals found in the file. Please check that you uploaded a DMS Sales Analysis Detail report with the correct format (Date, Age, Stock, Vin6, Vehicle, Trade, SLP, Customer, Gross, FI, Total).');
      }

      console.log(`Parsed ${deals.length} deals successfully`);

      // Create upload history record
      const { data: uploadHistory, error: uploadError } = await supabase
        .from('upload_history')
        .insert({
          original_filename: fileName,
          stored_filename: fileName,
          file_type: fileExtension.substring(1),
          file_size: file.size,
          upload_type: 'financial',
          total_rows: deals.length,
          user_id: userId,
          processing_status: 'processing'
        })
        .select()
        .single();

      if (uploadError) {
        console.error('Upload history error:', uploadError);
        throw uploadError;
      }

      // Insert financial data - let it extract the date from the deals
      const result = await insertFinancialData(deals, summary, uploadHistory.id);

      // Update upload history
      await supabase
        .from('upload_history')
        .update({
          processing_status: 'completed',
          successful_imports: result.insertedCount,
          processed_at: new Date().toISOString()
        })
        .eq('id', uploadHistory.id);

      const preservationMessage = result.preservedDealTypes && result.preservedDealTypes > 0 
        ? ` (${result.preservedDealTypes} existing deal types preserved)`
        : '';

      const inventoryMessage = result.missingFromInventory > 0 
        ? ` (${result.dealsWithoutInventoryLink} deals processed without inventory link due to missing stock numbers)`
        : '';

      setUploadResult({
        status: 'success',
        message: `Successfully processed ${result.insertedCount} deals for ${result.reportDate}${preservationMessage}${inventoryMessage}`,
        dealsProcessed: result.insertedCount,
        summary: result.summary,
        reportDate: result.reportDate,
        preservedDealTypes: result.preservedDealTypes,
        dealsWithInventoryLink: result.dealsWithInventoryLink,
        dealsWithoutInventoryLink: result.dealsWithoutInventoryLink,
        missingFromInventory: result.missingFromInventory,
        missingStockNumbers: result.missingStockNumbers
      });

      toast({
        title: "Upload successful!",
        description: `Processed ${result.insertedCount} deals from ${fileName} for ${result.reportDate}${preservationMessage}${inventoryMessage}`,
      });

    } catch (error) {
      console.error('Financial upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setUploadResult({
        status: 'error',
        message: errorMessage
      });
      
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  return {
    uploading,
    uploadResult,
    handleFileUpload
  };
};
