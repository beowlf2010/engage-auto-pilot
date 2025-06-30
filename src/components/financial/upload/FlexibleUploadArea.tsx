
import { useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, Search } from "lucide-react";

interface FlexibleUploadAreaProps {
  onFileSelected: (file: File) => void;
  analyzing: boolean;
  uploading: boolean;
}

const FlexibleUploadArea = ({ onFileSelected, analyzing, uploading }: FlexibleUploadAreaProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelected(file);
    }
    // Reset input value
    e.target.value = '';
  };

  const isDisabled = analyzing || uploading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="w-5 h-5" />
          <span>Upload Financial Report</span>
        </CardTitle>
        <CardDescription>
          Upload your financial report in any format - we'll help you map the columns
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            disabled={isDisabled}
            className="hidden"
            id="flexible-financial-file-upload"
          />
          <label
            htmlFor="flexible-financial-file-upload"
            className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              isDisabled 
                ? 'border-gray-300 bg-gray-50 cursor-not-allowed' 
                : 'border-blue-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            {analyzing ? (
              <div className="text-center">
                <Search className="w-8 h-8 text-blue-500 mx-auto mb-2 animate-pulse" />
                <p className="text-sm text-gray-600">Analyzing file structure...</p>
                <p className="text-xs text-gray-500">This may take a moment</p>
              </div>
            ) : uploading ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Processing financial data...</p>
              </div>
            ) : (
              <div className="text-center">
                <FileSpreadsheet className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">Click to analyze and upload</p>
                <p className="text-xs text-gray-500">Excel (.xlsx, .xls) or CSV (.csv)</p>
                <p className="text-xs text-gray-400 mt-1">Any format supported with field mapping</p>
              </div>
            )}
          </label>
          
          <div className="text-center">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isDisabled}
              className="w-full"
            >
              {analyzing ? 'Analyzing...' : uploading ? 'Processing...' : 'Choose File'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FlexibleUploadArea;
