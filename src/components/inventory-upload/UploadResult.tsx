
import { Card } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

interface UploadResultProps {
  uploadResult: {
    total: number;
    success: number;
    errors: number;
    errorDetails: string[];
    fileType: string;
    fileName: string;
    condition: string;
    formatType?: string;
    uploadId?: string;
  };
}

const UploadResult = ({ uploadResult }: UploadResultProps) => {
  return (
    <Card className="p-6">
      <div className="flex items-center space-x-2 mb-4">
        <CheckCircle className="w-5 h-5 text-green-600" />
        <h3 className="text-lg font-medium">Upload Results</h3>
        <span className="text-sm text-slate-600">
          ({uploadResult.fileType.toUpperCase()}: {uploadResult.fileName})
        </span>
        {uploadResult.formatType && (
          <span className="text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
            {uploadResult.formatType.replace('_', ' ').toUpperCase()}
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-800">{uploadResult.total}</div>
          <div className="text-sm text-slate-600">Total Rows</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{uploadResult.success}</div>
          <div className="text-sm text-slate-600">Successful</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{uploadResult.errors}</div>
          <div className="text-sm text-slate-600">Errors</div>
        </div>
      </div>

      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <p className="text-sm text-blue-800">
          <strong>File Stored:</strong> Original file permanently stored with ID: {uploadResult.uploadId?.slice(-8)}
        </p>
      </div>

      {uploadResult.errorDetails && uploadResult.errorDetails.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Error Details:</h4>
          <div className="bg-red-50 border border-red-200 rounded p-3 max-h-32 overflow-y-auto">
            {uploadResult.errorDetails.map((error: string, index: number) => (
              <div key={index} className="text-sm text-red-800 mb-1">
                {error}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default UploadResult;
