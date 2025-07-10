
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Database, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";

interface UploadAreaProps {
  onFilesSelected: (files: FileList) => void;
  uploading: boolean;
}

const UploadArea = ({ onFilesSelected, uploading }: UploadAreaProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [lastUploadedFile, setLastUploadedFile] = useState<string | null>(null);
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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const fileNames = Array.from(e.dataTransfer.files).map(f => f.name);
      setLastUploadedFile(fileNames.length === 1 ? fileNames[0] : `${fileNames.length} files`);
      console.log('📁 [UPLOAD AREA] Files dropped, calling onFilesSelected:', fileNames);
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (files: FileList) => {
    if (files && files.length > 0) {
      const fileNames = Array.from(files).map(f => f.name);
      setLastUploadedFile(fileNames.length === 1 ? fileNames[0] : `${fileNames.length} files`);
      console.log('📁 [UPLOAD AREA] Files selected, calling onFilesSelected:', fileNames);
      onFilesSelected(files);
    }
  };

  const supportedFormats = [
    { ext: "CSV", icon: FileText, description: "Comma-separated values" },
    { ext: "XLSX", icon: FileSpreadsheet, description: "Excel workbook" },
    { ext: "XLS", icon: FileSpreadsheet, description: "Legacy Excel format" },
    { ext: "TXT", icon: FileText, description: "Plain text (tab or comma separated)" }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="w-5 h-5" />
          <span>Upload File</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
            dragActive 
              ? 'border-blue-500 bg-blue-50 scale-105' 
              : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
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
                <p className="text-slate-600 font-medium">Processing CSV file...</p>
                <div className="flex items-center justify-center space-x-2 text-sm text-slate-500">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Parsing data and preparing for bypass upload</span>
                </div>
                {lastUploadedFile && (
                  <div className="flex items-center justify-center space-x-2 text-xs text-slate-400">
                    <FileSpreadsheet className="w-3 h-3" />
                    <span>{lastUploadedFile}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <FileSpreadsheet className="w-8 h-8 text-blue-600" />
              </div>
              
              <div>
                <p className="text-lg font-medium text-slate-800 mb-2">
                  Drop your files here
                </p>
                <p className="text-slate-600 mb-4">
                  or click to browse and select multiple files
                </p>
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  className="mx-auto"
                >
                  Choose Files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.txt"
                  multiple
                  onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                  className="hidden"
                />
              </div>

              {lastUploadedFile && (
                <div className="flex items-center justify-center space-x-2 text-sm text-green-600 bg-green-50 rounded-lg p-2">
                  <CheckCircle className="w-4 w-4" />
                  <span>Last uploaded: {lastUploadedFile}</span>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-600">
                  Supported File Formats:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {supportedFormats.map((format) => {
                    const Icon = format.icon;
                    return (
                      <div key={format.ext} className="flex items-center space-x-2 text-xs text-slate-500 bg-slate-50 rounded p-2">
                        <Icon className="w-3 h-3" />
                        <div>
                          <div className="font-medium">{format.ext}</div>
                          <div className="text-xs">{format.description}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="flex items-start space-x-2 text-xs text-amber-600 bg-amber-50 rounded p-2 mt-3">
                  <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Processing Note:</div>
                    <div>File will be parsed locally - use Bypass Upload button to save to database</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UploadArea;
