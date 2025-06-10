
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Database } from "lucide-react";

interface UploadAreaProps {
  onFilesSelected: (files: FileList) => void;
  uploading: boolean;
}

const UploadArea = ({ onFilesSelected, uploading }: UploadAreaProps) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="w-5 h-5" />
          <span>Upload CSV File</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-slate-300 hover:border-slate-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {uploading ? (
            <div className="space-y-4">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <div className="space-y-2">
                <p className="text-slate-600 font-medium">Processing and saving leads...</p>
                <div className="flex items-center justify-center space-x-2 text-sm text-slate-500">
                  <Database className="w-4 h-4" />
                  <span>Validating duplicates and inserting to database</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-medium text-slate-800 mb-2">
                  Drop your CSV file here
                </p>
                <p className="text-slate-600 mb-4">
                  or click to browse and select a file
                </p>
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  className="mx-auto"
                >
                  Choose File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={(e) => e.target.files && onFilesSelected(e.target.files)}
                  className="hidden"
                />
              </div>
              <p className="text-sm text-slate-500">
                Supported formats: CSV and TXT files
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UploadArea;
