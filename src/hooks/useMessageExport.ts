import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  createMessageExport, 
  getMessageExports, 
  processMessageImport, 
  parseVINExportFile,
  parseVINCSVFile,
  parseVINExcelFile,
  type VINMessageExport 
} from '@/services/messageExportService';

export const useMessageExport = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [exports, setExports] = useState<any[]>([]);

  const loadExports = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getMessageExports();
      setExports(data);
    } catch (error) {
      console.error('Error loading exports:', error);
      toast({
        title: "Error",
        description: "Failed to load message exports",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const importFromFile = useCallback(async (file: File, exportName: string) => {
    try {
      setIsLoading(true);
      
      let parsedData: VINMessageExport;
      
      // Check file type and parse accordingly
      const fileExtension = file.name.toLowerCase().split('.').pop();
      
      if (fileExtension === 'json') {
        const fileContent = await file.text();
        parsedData = parseVINExportFile(fileContent);
      } else if (fileExtension === 'csv') {
        const fileContent = await file.text();
        parsedData = parseVINCSVFile(fileContent);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        parsedData = await parseVINExcelFile(file);
      } else {
        throw new Error('Unsupported file format. Please upload a JSON, CSV, or Excel file from VIN Solutions.');
      }
      
      // Create the export record
      const exportRecord = await createMessageExport(exportName, parsedData);
      
      toast({
        title: "File Uploaded Successfully",
        description: `Processed ${parsedData.export_info.total_leads} leads with ${parsedData.export_info.total_messages} messages from VIN Solutions export`,
      });

      // Refresh the exports list
      await loadExports();
      
      return exportRecord;
    } catch (error) {
      console.error('Error importing file:', error);
      toast({
        title: "Import Error",
        description: error instanceof Error ? error.message : "Failed to import VIN Solutions file",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast, loadExports]);

  const processImport = useCallback(async (exportId: string) => {
    try {
      setIsLoading(true);
      
      const results = await processMessageImport(exportId);
      
      toast({
        title: "Import Completed",
        description: `Created ${results.leads_created} new leads, matched ${results.leads_matched} existing leads, imported ${results.messages_imported} messages`,
      });

      if (results.errors.length > 0) {
        console.warn('Import errors:', results.errors);
        toast({
          title: "Import Warnings",
          description: `${results.errors.length} items had issues. Check console for details.`,
          variant: "destructive"
        });
      }

      // Refresh the exports list
      await loadExports();
      
      return results;
    } catch (error) {
      console.error('Error processing import:', error);
      toast({
        title: "Processing Error",
        description: "Failed to process the import",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast, loadExports]);

  const exportCurrentMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // This would export current system messages to a downloadable format
      // Implementation depends on requirements
      toast({
        title: "Export Started",
        description: "Message export feature coming soon",
      });
      
    } catch (error) {
      console.error('Error exporting messages:', error);
      toast({
        title: "Export Error",
        description: "Failed to export messages",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    exports,
    isLoading,
    loadExports,
    importFromFile,
    processImport,
    exportCurrentMessages
  };
};
