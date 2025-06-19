import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { parseEnhancedInventoryFile } from "@/utils/enhancedFileParsingUtils";
import { processLeadsEnhanced } from "@/components/upload-leads/enhancedProcessLeads";
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

  // Create flexible field mapping based on common CSV headers
  const createFlexibleMapping = (headers: string[]) => {
    console.log('Available CSV headers:', headers);
    
    // Check if this looks like a VIN Solutions message export
    const vinSolutionsIndicators = [
      'message_content', 'message_direction', 'customer_name', 
      'conversation_id', 'lead_name', 'message_body', 'timestamp'
    ];
    
    const hasVinSolutionsHeaders = vinSolutionsIndicators.some(indicator => 
      headers.some(header => header.toLowerCase().includes(indicator.toLowerCase()))
    );
    
    if (hasVinSolutionsHeaders) {
      throw new Error('This appears to be a VIN Solutions message export file. Please use the Message Import feature for VIN Solutions files.');
    }
    
    const findHeader = (possibleNames: string[]): string => {
      for (const name of possibleNames) {
        const found = headers.find(h => 
          h.toLowerCase().trim() === name.toLowerCase() ||
          h.toLowerCase().replace(/[^a-z]/g, '') === name.toLowerCase().replace(/[^a-z]/g, '')
        );
        if (found) {
          console.log(`Mapped ${possibleNames[0]} to "${found}"`);
          return found;
        }
      }
      console.log(`No mapping found for ${possibleNames[0]}`);
      return '';
    };

    const mapping = {
      firstName: findHeader(['firstname', 'first_name', 'fname', 'FirstName']),
      lastName: findHeader(['lastname', 'last_name', 'lname', 'LastName']),
      middleName: findHeader(['middlename', 'middle_name', 'mname', 'MiddleName']),
      email: findHeader(['email', 'emailaddress', 'email_address', 'Email']),
      emailAlt: findHeader(['email_alt', 'emailalt', 'alternate_email', 'Email2']),
      cellphone: findHeader(['cellphone', 'cell_phone', 'mobile', 'cell', 'CellPhone']),
      dayphone: findHeader(['dayphone', 'day_phone', 'homephone', 'home_phone', 'DayPhone']),
      evephone: findHeader(['evephone', 'evening_phone', 'eveningphone', 'EvePhone']),
      address: findHeader(['address', 'street', 'Address', 'StreetAddress']),
      city: findHeader(['city', 'City']),
      state: findHeader(['state', 'State']),
      postalCode: findHeader(['postalcode', 'postal_code', 'zip', 'zipcode', 'PostalCode']),
      vehicleYear: findHeader(['vehicleyear', 'vehicle_year', 'year', 'Year']),
      vehicleMake: findHeader(['vehiclemake', 'vehicle_make', 'make', 'Make']),
      vehicleModel: findHeader(['vehiclemodel', 'vehicle_model', 'model', 'Model']),
      vehicleVIN: findHeader(['vin', 'VIN', 'vehicle_vin']),
      source: findHeader(['source', 'Source', 'lead_source']),
      salesPersonFirstName: findHeader(['salespersonfirstname', 'salesperson_first_name', 'SalesPersonFirstName', 'sales_person_first_name']),
      salesPersonLastName: findHeader(['salespersonlastname', 'salesperson_last_name', 'SalesPersonLastName', 'sales_person_last_name']),
      doNotCall: findHeader(['donotcall', 'do_not_call', 'DoNotCall']),
      doNotEmail: findHeader(['donotemail', 'do_not_email', 'DoNotEmail']),
      doNotMail: findHeader(['donotmail', 'do_not_mail', 'DoNotMail']),
      status: findHeader(['status', 'Status', 'lead_status', 'LeadStatus'])
    };

    console.log('Created mapping:', mapping);
    return mapping;
  };

  const processFile = async (queuedFile: QueuedLeadFile): Promise<void> => {
    try {
      updateFileStatus(queuedFile.id, 'processing');
      
      // Check if file needs sheet selection
      const fileSelectionResult = await handleFileSelection(queuedFile.file);
      
      if (fileSelectionResult.shouldShowSheetSelector) {
        throw new Error('Multi-sheet Excel files require individual processing. Please save each sheet as a separate file or use the single-file upload with sheet selection.');
      }
      
      // Parse the file
      const parsed = await parseEnhancedInventoryFile(queuedFile.file);
      console.log(`Parsed lead file with ${parsed.rows.length} rows and headers:`, parsed.headers);
      
      if (parsed.rows.length === 0) {
        throw new Error('No data rows found in file');
      }

      // Create flexible field mapping with VIN Solutions detection
      const flexibleMapping = createFlexibleMapping(parsed.headers);
      
      // Process leads with enhanced data preservation
      const processingResult = await processLeadsEnhanced(
        parsed, 
        flexibleMapping,
        queuedFile.file.name,
        queuedFile.file.size,
        queuedFile.file.type
      );
      
      console.log(`Processing result: ${processingResult.validLeads.length} valid leads, ${processingResult.errors.length} errors, ${processingResult.duplicates.length} duplicates`);
      
      if (processingResult.validLeads.length === 0) {
        console.error('Processing errors:', processingResult.errors);
        throw new Error(`No valid leads could be processed. Common issues: ${processingResult.errors.slice(0, 3).map(e => e.error).join(', ')}`);
      }
      
      // Insert leads to database with upload history tracking
      const insertResult = await insertLeadsToDatabase(
        processingResult.validLeads,
        processingResult.uploadHistoryId
      );
      
      console.log(`Insert result: ${insertResult.successfulInserts} successful, ${insertResult.errors.length} errors`);
      
      updateFileStatus(queuedFile.id, 'completed', undefined, {
        totalRows: parsed.rows.length,
        successfulImports: insertResult.successfulInserts,
        errors: processingResult.errors.length + insertResult.errors.length,
        duplicates: processingResult.duplicates.length + insertResult.duplicates.length
      });

    } catch (error) {
      console.error(`Enhanced upload error for ${queuedFile.file.name}:`, error);
      
      let errorMessage = error instanceof Error ? error.message : 'Processing failed';
      
      // Provide more helpful error messages
      if (errorMessage.includes('VIN Solutions')) {
        errorMessage = 'VIN Solutions message files detected. Please use the Message Import feature instead of the lead upload.';
      } else if (errorMessage.includes('Multi-sheet')) {
        errorMessage = 'Multi-sheet Excel file detected. Please save each sheet separately or use single-file upload with sheet selection.';
      }
      
      updateFileStatus(queuedFile.id, 'error', errorMessage);
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
      } else if (successfulFiles > 0) {
        toast({
          title: "Batch upload completed with some errors",
          description: `${successfulFiles} files succeeded, ${failedFiles} files failed. Check results for details.`,
          variant: "default"
        });
      } else {
        toast({
          title: "Batch upload failed",
          description: "All files failed to process. Please check the file formats and try again.",
          variant: "destructive"
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
