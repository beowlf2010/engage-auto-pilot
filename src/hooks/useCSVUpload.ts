
import { useState } from 'react';
import { ProcessedLead } from '@/components/upload-leads/duplicateDetection';
import { parseCSVText } from '@/utils/csvParser';
import { performAutoDetection } from '@/components/csv-mapper/fieldMappingUtils';
import { processLeadsEnhanced } from '@/components/upload-leads/processLeads';

export interface CSVUploadResult {
  success: boolean;
  totalProcessed: number;
  successfulInserts: number;
  errors: any[];
  message: string;
}

export interface ParsedCSVData {
  processedLeads: ProcessedLead[];
  duplicates: any[];
  errors: any[];
}

export const useCSVUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<CSVUploadResult | null>(null);
  const [processedData, setProcessedData] = useState<ParsedCSVData | null>(null);

  const handleFileUpload = async (file: File, updateExisting: boolean = false) => {
    setUploading(true);
    setProcessedData(null);
    setUploadResult(null);

    try {
      console.log('🔄 [CSV UPLOAD] Starting file processing:', file.name);
      
      // Parse CSV file
      const text = await file.text();
      const parsedCSV = parseCSVText(text);
      
      console.log('📊 [CSV UPLOAD] Parsed CSV headers:', parsedCSV.headers);
      console.log('📊 [CSV UPLOAD] Total rows:', parsedCSV.rows.length);
      
      // Auto-detect field mapping
      const fieldMapping = performAutoDetection(parsedCSV.headers);
      console.log('🔍 [CSV UPLOAD] Auto-detected field mapping:', fieldMapping);
      
      // Process leads using the enhanced processor (without database validation)
      const processResult = await processLeadsEnhanced(
        parsedCSV.rows,
        fieldMapping,
        [], // No existing leads for duplicate checking since we're bypassing
        updateExisting
      );
      
      console.log('✅ [CSV UPLOAD] Processing complete:', {
        processedCount: processResult.processedLeads.length,
        duplicatesCount: processResult.duplicates.length,
        errorsCount: processResult.errors.length
      });
      
      // Set processed data - this will enable the bypass upload button
      const processedData: ParsedCSVData = {
        processedLeads: processResult.processedLeads,
        duplicates: processResult.duplicates,
        errors: processResult.errors
      };
      
      setProcessedData(processedData);
      
    } catch (error) {
      console.error('💥 [CSV UPLOAD] File processing error:', error);
      setUploadResult({
        success: false,
        totalProcessed: 0,
        successfulInserts: 0,
        errors: [{ error: error instanceof Error ? error.message : 'Unknown error' }],
        message: 'File processing failed'
      });
    } finally {
      setUploading(false);
    }
  };

  const clearResults = () => {
    setUploadResult(null);
    setProcessedData(null);
  };

  return {
    uploading,
    uploadResult,
    processedData,
    handleFileUpload,
    clearResults
  };
};
