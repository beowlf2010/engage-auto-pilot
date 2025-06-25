
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
  ArrowLeft,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

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
  const [allowPartialData, setAllowPartialData] = useState(true); // Default to flexible mode
  const [strictPhoneValidation, setStrictPhoneValidation] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
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
      console.log('Import options:', { updateExistingLeads, allowPartialData, strictPhoneValidation });
      
      // Process the data with enhanced data preservation and flexible validation
      const processingResult = await processLeadsEnhanced(
        csvData, 
        mapping,
        currentFile.name,
        currentFile.size,
        currentFile.type,
        { 
          updateExistingLeads,
          allowPartialData,
          strictPhoneValidation
        }
      );
      
      console.log('Enhanced processing complete:', {
        validLeads: processingResult.validLeads.length,
        duplicates: processingResult.duplicates.length,
        errors: processingResult.errors.length,
        warnings: processingResult.warnings.length,
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
        warnings: processingResult.warnings.length,
        fileName: currentFile.name,
        uploadHistoryId: processingResult.uploadHistoryId,
        phoneNumberStats: {
          cellOnly: processingResult.validLeads.filter(l => l.phoneNumbers.length === 1 && l.phoneNumbers[0].type === 'cell').length,
          multipleNumbers: processingResult.validLeads.filter(l => l.phoneNumbers.length > 1).length,
          dayPrimary: processingResult.validLeads.filter(l => l.phoneNumbers.length > 0 && l.phoneNumbers[0].type === 'day').length,
          needsReview: processingResult.validLeads.filter(l => l.phoneNumbers.some(p => p.status === 'needs_review')).length
        },
        duplicateDetails: allDuplicates,
        dataQualityMetrics: {
          averageQualityScore: processingResult.validLeads.length > 0 
            ? processingResult.validLeads.reduce((sum, lead) => sum + ((lead as any).dataQualityScore || 0), 0) / processingResult.validLeads.length 
            : 0,
          statusMappingCount: processingResult.validLeads.filter(lead => (lead as any).originalStatus && (lead as any).originalStatus !== lead.status).length,
          leadsWithValidPhones: processingResult.validLeads.filter(lead => (lead as any).hasValidPhone).length,
          leadsNeedingPhoneReview: processingResult.validLeads.filter(lead => !(lead as any).hasValidPhone).length
        },
        warningDetails: processingResult.warnings
      };
      
      setUploadResult(result);
      setUploading(false);
      setShowMapper(false);
      
      console.log('Enhanced upload process complete:', result);
      
      // Enhanced success messaging
      let successMessage = '';
      if (updateExistingLeads && insertResult.successfulUpdates > 0) {
        successMessage = `${insertResult.successfulInserts} leads imported, ${insertResult.successfulUpdates} leads updated`;
        if (processingResult.warnings.length > 0) {
          successMessage += `, ${processingResult.warnings.length} warnings`;
        }
      } else if (allDuplicates.length > 0 || processingResult.warnings.length > 0) {
        successMessage = `${insertResult.successfulInserts} leads imported`;
        const issues = [];
        if (allDuplicates.length > 0) issues.push(`${allDuplicates.length} duplicates skipped`);
        if (processingResult.warnings.length > 0) issues.push(`${processingResult.warnings.length} warnings`);
        if (issues.length > 0) successMessage += ` with ${issues.join(', ')}`;
      } else {
        successMessage = `${insertResult.successfulInserts} leads imported successfully`;
      }
      
      toast({
        title: processingResult.warnings.length > 0 ? "Upload completed with warnings" : "Upload successful!",
        description: successMessage,
        variant: processingResult.warnings.length > 0 ? "default" : "default"
      });

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

        {/* Import Options Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Import Options</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="allowPartialData" 
                checked={allowPartialData}
                onCheckedChange={setAllowPartialData}
              />
              <Label htmlFor="allowPartialData" className="text-sm">
                Allow flexible imports (recommended) - Import leads even with incomplete phone numbers for manual review
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="updateExistingLeads" 
                checked={updateExistingLeads}
                onCheckedChange={setUpdateExistingLeads}
              />
              <Label htmlFor="updateExistingLeads" className="text-sm">
                Update existing leads if duplicates are found
              </Label>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="text-xs"
            >
              {showAdvancedOptions ? 'Hide' : 'Show'} Advanced Options
            </Button>

            {showAdvancedOptions && (
              <>
                <Separator />
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="strictPhoneValidation" 
                    checked={strictPhoneValidation}
                    onCheckedChange={setStrictPhoneValidation}
                  />
                  <Label htmlFor="strictPhoneValidation" className="text-sm">
                    Strict phone validation (only US 10/11 digit numbers)
                  </Label>
                </div>
              </>
            )}

            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              <strong>Recommendation:</strong> Keep "Allow flexible imports" enabled to maximize import success. 
              Leads with data quality issues will be flagged for manual review rather than rejected.
            </div>
          </CardContent>
        </Card>

        <CSVFieldMapper
          headers={csvData.headers}
          sampleData={csvData.sample}
          onMappingComplete={handleMappingComplete}
          uploading={uploading}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Upload Leads</h1>
        <p className="text-slate-600 mt-1">
          Import leads from CSV, Excel, or text files with enhanced validation and flexible processing
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <UploadArea onFilesSelected={handleFiles} />
          <ImportFeaturesCard />
        </div>
        
        <div className="space-y-6">
          <CSVTemplateCard />
          <PhonePriorityCard />
        </div>
      </div>

      {uploadResult && (
        <UploadResult result={uploadResult} />
      )}
    </div>
  );
};

export default UploadLeads;
