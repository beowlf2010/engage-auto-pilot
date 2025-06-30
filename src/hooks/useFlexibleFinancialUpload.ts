
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { analyzeFileStructure, parseFinancialFileWithMapping } from "@/utils/financialFlexibleParser";
import { insertFinancialData } from "@/utils/financialDataOperations";
import { supabase } from "@/integrations/supabase/client";
import { FinancialFieldMapping } from "@/components/financial/FinancialCSVFieldMapper";

interface FileAnalysisResult {
  headers: string[];
  sampleData: Record<string, string>;
  headerRowIndex: number;
  totalRows: number;
  confidence: number;
}

interface UploadResult {
  status: 'success' | 'error';
  message: string;
  dealsProcessed?: number;
  summary?: any;
  reportDate?: string;
}

export const useFlexibleFinancialUpload = (userId: string) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileAnalysis, setFileAnalysis] = useState<FileAnalysisResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [showFieldMapping, setShowFieldMapping] = useState(false);
  const { toast } = useToast();

  const analyzeFile = async (file: File) => {
    // Validate file type
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      toast({
        title: "Invalid file format",
        description: "Please upload an Excel file (.xlsx, .xls) or CSV file (.csv)",
        variant: "destructive"
      });
      return;
    }

    setAnalyzing(true);
    setUploadResult(null);
    setSelectedFile(file);

    try {
      console.log('Analyzing file structure:', file.name);
      
      const analysis = await analyzeFileStructure(file);
      setFileAnalysis(analysis);
      setShowFieldMapping(true);
      
      toast({
        title: "File analyzed successfully",
        description: `Found ${analysis.headers.length} columns. Please map the required fields.`,
      });

    } catch (error) {
      console.error('File analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'File analysis failed';
      
      toast({
        title: "File analysis failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const processFileWithMapping = async (mapping: FinancialFieldMapping) => {
    if (!selectedFile || !fileAnalysis) return;

    setUploading(true);
    setUploadResult(null);

    try {
      console.log('Processing file with mapping:', selectedFile.name);
      
      // Parse the file using the field mapping
      const { deals, summary, fileName } = await parseFinancialFileWithMapping(selectedFile, mapping);

      if (deals.length === 0) {
        throw new Error('No valid deals found in the file with the current mapping. Please check your field mappings.');
      }

      console.log(`Parsed ${deals.length} deals successfully`);

      // Create upload history record
      const { data: uploadHistory, error: uploadError } = await supabase
        .from('upload_history')
        .insert({
          original_filename: fileName,
          stored_filename: fileName,
          file_type: selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.') + 1),
          file_size: selectedFile.size,
          upload_type: 'financial_flexible',
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

      // Insert financial data
      const result = await insertFinancialData(deals, summary, uploadHistory.id);

      // Update upload history
      await supabase
        .from('upload_history')
        .update({
          processing_status: 'completed',
          successful_imports: result.insertedDeals,
          processed_at: new Date().toISOString()
        })
        .eq('id', uploadHistory.id);

      setUploadResult({
        status: 'success',
        message: `Successfully processed ${result.insertedDeals} deals for ${result.reportDate}`,
        dealsProcessed: result.insertedDeals,
        summary: result.summary,
        reportDate: result.reportDate
      });

      setShowFieldMapping(false);

      toast({
        title: "Upload successful!",
        description: `Processed ${result.insertedDeals} deals from ${fileName} for ${result.reportDate}`,
      });

    } catch (error) {
      console.error('Flexible financial upload error:', error);
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
    }
  };

  const cancelMapping = () => {
    setShowFieldMapping(false);
    setFileAnalysis(null);
    setSelectedFile(null);
  };

  const clearResults = () => {
    setUploadResult(null);
    setFileAnalysis(null);
    setSelectedFile(null);
    setShowFieldMapping(false);
  };

  return {
    analyzing,
    uploading,
    fileAnalysis,
    uploadResult,
    showFieldMapping,
    analyzeFile,
    processFileWithMapping,
    cancelMapping,
    clearResults
  };
};
