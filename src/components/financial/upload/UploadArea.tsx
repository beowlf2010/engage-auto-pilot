
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileSpreadsheet } from "lucide-react";

interface UploadAreaProps {
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
}

const UploadArea = ({ onFileUpload, uploading }: UploadAreaProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="w-5 h-5" />
          <span>Upload DMS Report</span>
        </CardTitle>
        <CardDescription>
          Upload your daily DMS Sales Analysis Detail report in Excel format
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={onFileUpload}
            disabled={uploading}
            className="hidden"
            id="financial-file-upload"
          />
          <label
            htmlFor="financial-file-upload"
            className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              uploading 
                ? 'border-gray-300 bg-gray-50 cursor-not-allowed' 
                : 'border-blue-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            {uploading ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Processing financial data...</p>
              </div>
            ) : (
              <div className="text-center">
                <FileSpreadsheet className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">Click to upload Excel file</p>
                <p className="text-xs text-gray-500">DMS Sales Analysis Detail Report (.xlsx, .xls)</p>
              </div>
            )}
          </label>
        </div>
      </CardContent>
    </Card>
  );
};

export default UploadArea;
