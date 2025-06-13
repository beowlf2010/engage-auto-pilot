
import AccessDenied from "./upload/AccessDenied";
import UploadInfoCard from "./upload/UploadInfoCard";
import EnhancedUploadArea from "./upload/EnhancedUploadArea";
import BatchUploadResult from "./upload/BatchUploadResult";
import { useEnhancedFinancialUpload } from "@/hooks/useEnhancedFinancialUpload";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface FinancialUploadProps {
  user: {
    id: string;
    role: string;
  };
}

const FinancialUpload = ({ user }: FinancialUploadProps) => {
  const { 
    queuedFiles, 
    uploading, 
    batchResult, 
    addFiles, 
    removeFile, 
    processBatch, 
    clearResults 
  } = useEnhancedFinancialUpload(user.id);

  // Check permissions
  if (!["manager", "admin"].includes(user.role)) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Upload Financial Data</h2>
          <p className="text-slate-600 mt-1">
            Import multiple DMS Sales Analysis Detail reports with drag & drop functionality
          </p>
        </div>
        {batchResult && (
          <Button onClick={clearResults} variant="outline" className="flex items-center space-x-2">
            <Trash2 className="w-4 h-4" />
            <span>Clear Results</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EnhancedUploadArea
          onFilesSelected={addFiles}
          onFileRemove={removeFile}
          onProcessFiles={processBatch}
          queuedFiles={queuedFiles}
          uploading={uploading}
        />
        <UploadInfoCard />
      </div>

      {batchResult && (
        <BatchUploadResult result={batchResult} />
      )}
    </div>
  );
};

export default FinancialUpload;
