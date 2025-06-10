
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Download,
  Users
} from "lucide-react";

interface UploadLeadsProps {
  user: {
    role: string;
  };
}

const UploadLeads = ({ user }: UploadLeadsProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFiles = async (files: FileList) => {
    const file = files[0];
    
    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid file format",
        description: "Please upload a CSV file",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    
    // Simulate file processing
    setTimeout(() => {
      const mockResult = {
        totalRows: 150,
        successfulImports: 142,
        errors: 8,
        duplicates: 5,
        fileName: file.name
      };
      
      setUploadResult(mockResult);
      setUploading(false);
      
      toast({
        title: "Upload successful!",
        description: `${mockResult.successfulImports} leads imported successfully`,
      });
    }, 3000);
  };

  const downloadTemplate = () => {
    // In real app, this would download actual CSV template
    const csvContent = "first_name,last_name,phone,email,vehicle_interest,source\nJohn,Doe,+1-555-0100,john.doe@email.com,Tesla Model 3,Website\nJane,Smith,+1-555-0101,jane.smith@email.com,BMW X5,Facebook Ad";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Upload Leads</h1>
        <p className="text-slate-600 mt-1">
          Import new leads from CSV files to distribute among your sales team
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Area */}
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
                  <p className="text-slate-600">Processing your file...</p>
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
                      accept=".csv"
                      onChange={(e) => e.target.files && handleFiles(e.target.files)}
                      className="hidden"
                    />
                  </div>
                  <p className="text-sm text-slate-500">
                    Supported format: CSV files only
                  </p>
                </div>
              )}
            </div>

            {/* Upload Result */}
            {uploadResult && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-green-800 mb-2">
                      Upload completed successfully!
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-green-700">Total rows:</span>
                        <span className="font-medium ml-2">{uploadResult.totalRows}</span>
                      </div>
                      <div>
                        <span className="text-green-700">Imported:</span>
                        <span className="font-medium ml-2">{uploadResult.successfulImports}</span>
                      </div>
                      <div>
                        <span className="text-green-700">Duplicates:</span>
                        <span className="font-medium ml-2">{uploadResult.duplicates}</span>
                      </div>
                      <div>
                        <span className="text-green-700">Errors:</span>
                        <span className="font-medium ml-2">{uploadResult.errors}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions & Template */}
        <div className="space-y-6">
          {/* CSV Template */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Download className="w-5 h-5" />
                <span>CSV Template</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-4">
                Download our CSV template to ensure your data is formatted correctly
              </p>
              <Button variant="outline" onClick={downloadTemplate} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </CardContent>
          </Card>

          {/* Required Fields */}
          <Card>
            <CardHeader>
              <CardTitle>Required Fields</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">first_name</span>
                  <span className="text-xs text-slate-500">Required</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">last_name</span>
                  <span className="text-xs text-slate-500">Required</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">phone</span>
                  <span className="text-xs text-slate-500">Required (unique)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">email</span>
                  <span className="text-xs text-slate-500">Optional</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">vehicle_interest</span>
                  <span className="text-xs text-slate-500">Optional</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">source</span>
                  <span className="text-xs text-slate-500">Optional</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Distribution Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Distribution Rules</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-slate-600">
                <p>• Leads are automatically distributed round-robin among active salespeople</p>
                <p>• AI follow-up is enabled by default for new leads</p>
                <p>• Duplicate phone numbers are skipped during import</p>
                <p>• All new leads start with "new" status</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UploadLeads;
