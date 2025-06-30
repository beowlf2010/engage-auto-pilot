
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import AccessDenied from "./upload/AccessDenied";
import FlexibleUploadInfoCard from "./upload/FlexibleUploadInfoCard";
import FlexibleUploadArea from "./upload/FlexibleUploadArea";
import FinancialCSVFieldMapper from "./FinancialCSVFieldMapper";
import UploadResult from "./upload/UploadResult";
import { useFlexibleFinancialUpload } from "@/hooks/useFlexibleFinancialUpload";

interface FlexibleFinancialUploadProps {
  user: {
    id: string;
    role: string;
  };
}

const FlexibleFinancialUpload = ({ user }: FlexibleFinancialUploadProps) => {
  const { 
    analyzing,
    uploading,
    fileAnalysis,
    uploadResult,
    showFieldMapping,
    analyzeFile,
    processFileWithMapping,
    cancelMapping,
    clearResults
  } = useFlexibleFinancialUpload(user.id);

  // Check permissions
  if (!["manager", "admin"].includes(user.role)) {
    return <AccessDenied />;
  }

  // Show field mapping interface
  if (showFieldMapping && fileAnalysis) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Map Financial Data Fields</h2>
          <p className="text-slate-600 mt-1">
            Connect your file's columns to the required financial data fields
          </p>
        </div>
        
        <FinancialCSVFieldMapper
          csvHeaders={fileAnalysis.headers}
          sampleData={fileAnalysis.sampleData}
          onMappingComplete={processFileWithMapping}
          onCancel={cancelMapping}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Upload Financial Data</h2>
          <p className="text-slate-600 mt-1">
            Import your financial reports with flexible column mapping
          </p>
        </div>
        {uploadResult && (
          <Button onClick={clearResults} variant="outline" className="flex items-center space-x-2">
            <Trash2 className="w-4 h-4" />
            <span>Clear Results</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FlexibleUploadArea
          onFileSelected={analyzeFile}
          analyzing={analyzing}
          uploading={uploading}
        />
        <FlexibleUploadInfoCard />
      </div>

      {uploadResult && (
        <UploadResult result={uploadResult} />
      )}
    </div>
  );
};

export default FlexibleFinancialUpload;
