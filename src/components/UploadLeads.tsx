import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import CSVFieldMapper from "./CSVFieldMapper";
import UploadArea from "./upload-leads/UploadArea";
import UploadResult from "./upload-leads/UploadResult";
import CSVTemplateCard from "./upload-leads/CSVTemplateCard";
import PhonePriorityCard from "./upload-leads/PhonePriorityCard";
import ImportFeaturesCard from "./upload-leads/ImportFeaturesCard";
import { parseCSV } from "./upload-leads/csvParsingUtils";
import { processLeads } from "./upload-leads/processLeads";
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
    
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      toast({
        title: "Invalid file format",
        description: "Please upload a CSV or TXT file",
        variant: "destructive"
      });
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      setCsvData(parsed);
      setShowMapper(true);
      
      console.log('Parsed CSV:', parsed);
    } catch (error) {
      toast({
        title: "Error parsing file",
        description: "Could not parse the CSV file. Please check the format.",
        variant: "destructive"
      });
    }
  };

  const handleMappingComplete = async (mapping: any) => {
    if (!csvData) return;
    
    setUploading(true);
    
    try {
      // Process the CSV data with the field mapping and duplicate detection
      const processingResult = processLeads(csvData, mapping);

      // Simulate processing time with real-time feedback
      setTimeout(() => {
        const mockResult = {
          totalRows: csvData.rows.length,
          successfulImports: processingResult.validLeads.length,
          errors: processingResult.errors.length,
          duplicates: processingResult.duplicates.length,
          fileName: 'leads.csv',
          phoneNumberStats: {
            cellOnly: processingResult.validLeads.filter(l => l.phoneNumbers.length === 1 && l.phoneNumbers[0].type === 'cell').length,
            multipleNumbers: processingResult.validLeads.filter(l => l.phoneNumbers.length > 1).length,
            dayPrimary: processingResult.validLeads.filter(l => l.phoneNumbers.length > 0 && l.phoneNumbers[0].type === 'day').length
          },
          duplicateDetails: processingResult.duplicates.map(d => ({
            rowIndex: d.rowIndex,
            duplicateType: d.duplicateType,
            leadName: `${d.lead.firstName} ${d.lead.lastName}`,
            conflictingName: `${d.conflictingLead.firstName} ${d.conflictingLead.lastName}`
          }))
        };
        
        setUploadResult(mockResult);
        setUploading(false);
        setShowMapper(false);
        
        console.log('Processing complete:', {
          validLeads: processingResult.validLeads.length,
          duplicates: processingResult.duplicates.length,
          errors: processingResult.errors.length
        });
        
        if (processingResult.duplicates.length > 0) {
          toast({
            title: "Upload completed with duplicates detected",
            description: `${processingResult.validLeads.length} leads imported, ${processingResult.duplicates.length} duplicates skipped`,
            variant: "default"
          });
        } else {
          toast({
            title: "Upload successful!",
            description: `${processingResult.validLeads.length} leads imported with no duplicates`,
          });
        }
      }, 3000);
      
    } catch (error) {
      setUploading(false);
      toast({
        title: "Processing error",
        description: "Error processing the CSV data",
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
            <h1 className="text-3xl font-bold text-slate-800">Map CSV Fields</h1>
            <p className="text-slate-600 mt-1">
              Configure how your CSV columns map to our system fields
            </p>
          </div>
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
          Import leads with multiple phone numbers and automatic priority handling
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
