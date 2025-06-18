
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { parseEnhancedInventoryFile } from "@/utils/enhancedFileParsingUtils";
import { processLeads } from "@/components/upload-leads/processLeads";
import { insertLeadsToDatabase } from "@/utils/supabaseLeadOperations";
import { handleFileSelection } from "@/utils/fileUploadHandlers";

interface QueuedLeadFile {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  results?: {
    totalRows: number;
    successfulImports: number;
    errors: number;
    duplicates: number;
  };
}

interface BatchLeadUploadResult {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  totalLeads: number;
  successfulLeads: number;
  failedLeads: number;
  duplicateLeads: number;
  results: Array<{
    fileName: string;
    status: 'success' | 'error';
    records?: number;
    error?: string;
  }>;
}

export const useMultiFileLeadUpload = () => {
  const [processing, setProcessing] = useState(false);
  const [queuedFiles, setQueuedFiles] = useState<QueuedLeadFile[]>([]);
  const [batchResult, setBatchResult] = useState<BatchLeadUploadResult | null>(null);
  const { toast } = useToast();

  const addFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newFiles: QueuedLeadFile[] = fileArray.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: 'pending'
    }));
    
    setQueuedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (fileId: string) => {
    setQueuedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const clearQueue = () => {
    setQueuedFiles([]);
    setBatchResult(null);
  };

  const updateFileStatus = (fileId: string, status: QueuedLeadFile['status'], error?: string, results?: any) => {
    setQueuedFiles(prev => prev.map(f => 
      f.id === fileId 
        ? { ...f, status, error, results }
        : f
    ));
  };

  const processFile = async (queuedFile: QueuedLeadFile): Promise<void> => {
    try {
      updateFileStatus(queuedFile.id, 'processing');
      
      // Check if file needs sheet selection
      const fileSelectionResult = await handleFileSelection(queuedFile.file);
      
      if (fileSelectionResult.shouldShowSheetSelector) {
        throw new Error('Multi-sheet Excel files require individual processing');
      }
      
      // Parse the file
      const parsed = await parseEnhancedInventoryFile(queuedFile.file);
      console.log(`Parsed lead file with ${parsed.rows.length} rows`);
      
      // Create a basic field mapping for lead processing
      // This assumes the CSV has standard lead field names
      const basicMapping = {
        firstName: 'first_name',
        lastName: 'last_name',
        middleName: 'middle_name',
        email: 'email',
        emailAlt: 'email_alt',
        cellphone: 'phone',
        dayphone: 'day_phone',
        evephone: 'evening_phone',
        address: 'address',
        city: 'city',
        state: 'state',
        postalCode: 'postal_code',
        vehicleYear: 'vehicle_year',
        vehicleMake: 'vehicle_make',
        vehicleModel: 'vehicle_model',
        vehicleVIN: 'vin',
        source: 'source',
        salesPersonFirstName: 'salesperson_first_name',
        salesPersonLastName: 'salesperson_last_name',
        doNotCall: 'do_not_call',
        doNotEmail: 'do_not_email',
        doNotMail: 'do_not_mail',
        status: 'status'
      };
      
      // Process leads with proper mapping
      const processingResult = processLeads(parsed, basicMapping);
      
      // Insert leads to database
      const insertResult = await insertLeadsToDatabase(processingResult.validLeads);
      
      updateFileStatus(queuedFile.id, 'completed', undefined, {
        totalRows: parsed.rows.length,
        successfulImports: insertResult.successfulInserts,
        errors: processingResult.errors.length + insertResult.errors.length,
        duplicates: processingResult.duplicates.length + insertResult.duplicates.length
      });

    } catch (error) {
      console.error(`Upload error for ${queuedFile.file.name}:`, error);
      updateFileStatus(queuedFile.id, 'error', error instanceof Error ? error.message : 'Processing failed');
    }
  };

  const processBatch = async (): Promise<BatchLeadUploadResult> => {
    setProcessing(true);
    
    const results: BatchLeadUploadResult['results'] = [];
    let totalLeads = 0;
    let successfulLeads = 0;
    let failedLeads = 0;
    let duplicateLeads = 0;
    let successfulFiles = 0;
    let failedFiles = 0;

    try {
      for (const file of queuedFiles) {
        try {
          await processFile(file);
          
          if (file.results) {
            totalLeads += file.results.totalRows;
            successfulLeads += file.results.successfulImports;
            failedLeads += file.results.errors;
            duplicateLeads += file.results.duplicates;
            successfulFiles++;
            
            results.push({
              fileName: file.file.name,
              status: 'success',
              records: file.results.successfulImports
            });
          }
        } catch (error) {
          failedFiles++;
          results.push({
            fileName: file.file.name,
            status: 'error',
            error: error instanceof Error ? error.message : 'Processing failed'
          });
        }
      }

      const batchResult: BatchLeadUploadResult = {
        totalFiles: queuedFiles.length,
        successfulFiles,
        failedFiles,
        totalLeads,
        successfulLeads,
        failedLeads,
        duplicateLeads,
        results
      };

      setBatchResult(batchResult);

      if (failedFiles === 0) {
        toast({
          title: "Batch upload successful!",
          description: `${successfulFiles} files processed, ${successfulLeads} leads imported`,
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
    queuedFiles,
    processing,
    batchResult,
    addFiles,
    removeFile,
    clearQueue,
    processBatch
  };
};
