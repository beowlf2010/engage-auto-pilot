
import { useState } from 'react';
import { ProcessedLead } from '@/components/upload-leads/duplicateDetection';
import { parseCSVText } from '@/utils/csvParser';
import { performAutoDetection } from '@/components/csv-mapper/fieldMappingUtils';
import { processLeads } from '@/components/upload-leads/processLeads';

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
  soldCustomers: ProcessedLead[];
  soldCustomersCount: number;
}

export const useCSVUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<CSVUploadResult | null>(null);
  const [processedData, setProcessedData] = useState<ParsedCSVData | null>(null);

  const handleFileUpload = async (file: File, updateExisting: boolean = false) => {
    console.log('🔄 [CSV UPLOAD] Starting CSV PARSING ONLY for:', file.name);
    setUploading(true);
    setProcessedData(null);
    setUploadResult(null);

    try {
      // Parse CSV file
      const text = await file.text();
      const parsedCSV = parseCSVText(text);
      
      console.log('📊 [CSV UPLOAD] Parsed CSV headers:', parsedCSV.headers);
      console.log('📊 [CSV UPLOAD] Total rows:', parsedCSV.rows.length);
      
      // Auto-detect field mapping
      const fieldMapping = performAutoDetection(parsedCSV.headers);
      console.log('🔍 [CSV UPLOAD] Auto-detected field mapping:', fieldMapping);
      
      // Process leads using the standard processor (LOCAL PROCESSING ONLY)
      const processResult = processLeads(parsedCSV, fieldMapping);
      
      console.log('✅ [CSV UPLOAD] LOCAL Processing complete (NO DATABASE):', {
        processedCount: processResult.validLeads.length,
        duplicatesCount: processResult.duplicates.length,
        errorsCount: processResult.errors.length
      });
      
      // Set processed data - this will enable the bypass upload button
      const processedData: ParsedCSVData = {
        processedLeads: processResult.validLeads,
        duplicates: processResult.duplicates,
        errors: processResult.errors,
        soldCustomers: processResult.soldCustomers,
        soldCustomersCount: processResult.soldCustomersCount
      };
      
      setProcessedData(processedData);
      console.log('🎯 [CSV UPLOAD] processedData set, bypass button should appear');
      
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
      console.log('🔄 [CSV UPLOAD] Upload state set to false');
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
