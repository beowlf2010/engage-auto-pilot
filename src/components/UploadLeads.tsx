import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import CSVFieldMapper from "./CSVFieldMapper";
import UploadArea from "./upload-leads/UploadArea";
import UploadResult from "./upload-leads/UploadResult";
import CSVTemplateCard from "./upload-leads/CSVTemplateCard";
import PhonePriorityCard from "./upload-leads/PhonePriorityCard";
import ImportFeaturesCard from "./upload-leads/ImportFeaturesCard";
import { parseEnhancedInventoryFile } from "@/utils/enhancedFileParsingUtils";
import { processLeadsEnhanced } from "./upload-leads/enhancedProcessLeads";
import { insertLeadsToDatabase } from "@/utils/supabaseLeadOperations";
import { 
  AlertCircle,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface UploadLeadsProps {
  user: {
    role: string;
  };
}

const UploadLeads = ({ user }: UploadLeadsProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [csvData, setCsvData] = useState<{headers: string[], rows: any[], sample: Record<string, string>} | null>(null);
  const [showMapper, setShowMapper] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [updateExistingLeads, setUpdateExistingLeads] = useState(false);
  const { toast } = useToast();

  // Check permissions
  if (!["manager", "admin"].includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">Access Denied</h3>
          <p className="text-slate-600">Only managers and admins can upload leads</p>
        </div>
      </div>
    );
  }

  const handleFiles = async (files: FileList) => {
    const file = files[0];
    setCurrentFile(file);
    
    const validExtensions = ['.csv', '.xlsx', '.xls', '.txt'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      toast({
        title: "Invalid file format",
        description: "Please upload a CSV, Excel, or TXT file",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log(`Processing ${file.name}...`);
      const parsed = await parseEnhancedInventoryFile(file);
      setCsvData(parsed);
      setShowMapper(true);
      
      console.log(`Parsed ${parsed.fileType} file:`, parsed);
      
      toast({
        title: "File processed successfully",
        description: `${parsed.fileType.toUpperCase()} file with ${parsed.rows.length} rows is ready for field mapping`,
      });
    } catch (error) {
      console.error('File parsing error:', error);
      toast({
        title: "Error parsing file",
        description: error instanceof Error ? error.message : "Could not parse the file. Please check the format.",
        variant: "destructive"
      });
    }
  };

  const handleMappingComplete = async (mapping: any) => {
    if (!csvData || !currentFile) return;
    
    setUploading(true);
    
    try {
      console.log('Starting enhanced lead processing with mapping:', mapping);
      console.log('Update mode:', updateExistingLeads ? 'enabled' : 'disabled');
      
      // Process the data with enhanced data preservation and update option
      const processingResult = await processLeadsEnhanced(
        csvData, 
        mapping,
        currentFile.name,
        currentFile.size,
        currentFile.type,
        { updateExistingLeads }
      );
      
      console.log('Enhanced processing complete:', {
        validLeads: processingResult.validLeads.length,
        duplicates: processingResult.duplicates.length,
        errors: processingResult.errors.length,
        uploadHistoryId: processingResult.uploadHistoryId
      });

      // Insert leads to database with upload history tracking and update support
      const insertResult = await insertLeadsToDatabase(
        processingResult.validLeads,
        processingResult.uploadHistoryId,
        { updateExistingLeads }
      );
      
      console.log('Enhanced database operation complete:', insertResult);

      // Combine duplicates
      const allDuplicates = [
        ...processingResult.duplicates.map(d => ({
          rowIndex: d.rowIndex,
          duplicateType: d.duplicateType,
          leadName: `${d.lead.firstName} ${d.lead.lastName}`,
          conflictingName: `${d.conflictingLead.firstName} ${d.conflictingLead.lastName}` 
        })),
        ...insertResult.duplicates.map(d => ({
          rowIndex: d.rowIndex,
          duplicateType: d.duplicateType,
          leadName: `${d.leadData.firstName} ${d.leadData.lastName}`,
          conflictingName: 'Existing database record'
        }))
      ];

      const result = {
        totalRows: csvData.rows.length,
        successfulImports: insertResult.successfulInserts,
        successfulUpdates: insertResult.successfulUpdates,
        errors: processingResult.errors.length + insertResult.errors.length,
        duplicates: allDuplicates.length,
        fileName: currentFile.name,
        uploadHistoryId: processingResult.uploadHistoryId,
        phoneNumberStats: {
          cellOnly: processingResult.validLeads.filter(l => l.phoneNumbers.length === 1 && l.phoneNumbers[0].type === 'cell').length,
          multipleNumbers: processingResult.validLeads.filter(l => l.phoneNumbers.length > 1).length,
          dayPrimary: processingResult.validLeads.filter(l => l.phoneNumbers.length > 0 && l.phoneNumbers[0].type === 'day').length
        },
        duplicateDetails: allDuplicates,
        dataQualityMetrics: {
          averageQualityScore: processingResult.validLeads.length > 0 
            ? processingResult.validLeads.reduce((sum, lead) => sum + ((lead as any).dataSourceQualityScore || 0), 0) / processingResult.validLeads.length 
            : 0,
          statusMappingCount: processingResult.validLeads.filter(lead => (lead as any).originalStatus && (lead as any).originalStatus !== lead.status).length
        }
      };
      
      setUploadResult(result);
      setUploading(false);
      setShowMapper(false);
      
      console.log('Enhanced upload process complete:', result);
      
      if (updateExistingLeads && insertResult.successfulUpdates > 0) {
        toast({
          title: "Upload and update completed!",
          description: `${insertResult.successfulInserts} leads imported, ${insertResult.successfulUpdates} leads updated`,
        });
      } else if (allDuplicates.length > 0) {
        toast({
          title: "Upload completed with duplicates detected",
          description: `${insertResult.successfulInserts} leads imported, ${allDuplicates.length} duplicates skipped`,
          variant: "default"
        });
      } else {
        toast({
          title: "Upload successful!",
          description: `${insertResult.successfulInserts} leads imported with enhanced data preservation`,
        });
      }

      if (insertResult.errors.length > 0) {
        console.error('Database operation errors:', insertResult.errors);
        toast({
          title: "Some leads failed to process",
          description: `${insertResult.errors.length} leads failed due to database errors`,
          variant: "destructive"
        });
      }
      
    } catch (error) {
      setUploading(false);
      console.error('Enhanced upload error:', error);
      toast({
        title: "Processing error",
        description: "Error processing the data or saving to database",
        variant: "destructive"
      });
    }
  };

  if (showMapper && csvData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={() => setShowMapper(false)}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Upload</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Map Fields</h1>
            <p className="text-slate-600 mt-1">
              Configure how your file columns map to our system fields
            </p>
          </div>
        </div>

        {/* Update Existing Leads Option */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="updateExistingLeadsMapper"
              checked={updateExistingLeads}
              onChange={(e) => setUpdateExistingLeads(e.target.checked)}
              disabled={uploading}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="updateExistingLeadsMapper" className="text-sm font-medium text-blue-900">
              Update existing leads with new information
            </label>
          </div>
          <p className="text-xs text-blue-700 mt-2 ml-7">
            When enabled, leads that match existing records will be updated with any missing information from the upload.
          </p>
        </div>
        
        <CSVFieldMapper 
          csvHeaders={csvData.headers}
          sampleData={csvData.sample}
          onMappingComplete={handleMappingComplete}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Upload Leads</h1>
        <p className="text-slate-600 mt-1">
          Import leads from CSV or Excel files with enhanced data preservation and comprehensive tracking
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Area */}
        <div>
          <UploadArea onFilesSelected={handleFiles} uploading={uploading} />
          
          {/* Upload Result */}
          {uploadResult && (
            <UploadResult result={uploadResult} />
          )}
        </div>

        {/* Instructions & Template */}
        <div className="space-y-6">
          <CSVTemplateCard />
          <PhonePriorityCard />
          <ImportFeaturesCard />
        </div>
      </div>
    </div>
  );
};

export default UploadLeads;
