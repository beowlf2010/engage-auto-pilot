
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileSpreadsheet, AlertCircle, TrendingUp, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { parseFinancialFile } from "@/utils/financialFileParser";
import { insertFinancialData } from "@/utils/financialDataOperations";
import { supabase } from "@/integrations/supabase/client";

interface FinancialUploadProps {
  user: {
    id: string;
    role: string;
  };
}

interface UploadResult {
  status: 'success' | 'error';
  message: string;
  dealsProcessed?: number;
  summary?: any;
}

const FinancialUpload = ({ user }: FinancialUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const { toast } = useToast();

  // Check permissions
  if (!["manager", "admin"].includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">Access Denied</h3>
          <p className="text-slate-600">Only managers and admins can upload financial data</p>
        </div>
      </div>
    );
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      toast({
        title: "Invalid file format",
        description: "Please upload an Excel file (.xlsx or .xls)",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      console.log('Starting financial file upload:', file.name);
      
      // Parse the financial file
      const { deals, summary, fileName } = await parseFinancialFile(file);

      if (deals.length === 0) {
        throw new Error('No valid deals found in the file. Please check that you uploaded a DMS Sales Analysis Detail report.');
      }

      console.log(`Parsed ${deals.length} deals successfully`);

      // Create upload history record
      const { data: uploadHistory, error: uploadError } = await supabase
        .from('upload_history')
        .insert({
          original_filename: fileName,
          stored_filename: fileName,
          file_type: fileExtension.substring(1),
          file_size: file.size,
          upload_type: 'financial',
          total_rows: deals.length,
          user_id: user.id,
          processing_status: 'processing'
        })
        .select()
        .single();

      if (uploadError) {
        console.error('Upload history error:', uploadError);
        throw uploadError;
      }

      // Insert financial data
      const uploadDate = new Date().toISOString().split('T')[0];
      const result = await insertFinancialData(deals, summary, uploadHistory.id, uploadDate);

      // Update upload history
      await supabase
        .from('upload_history')
        .update({
          processing_status: 'completed',
          successful_imports: result.insertedDeals,
          processed_at: new Date().toISOString()
        })
        .eq('id', uploadHistory.id);

      setUploadResult({
        status: 'success',
        message: `Successfully processed ${result.insertedDeals} deals`,
        dealsProcessed: result.insertedDeals,
        summary: result.summary
      });

      toast({
        title: "Upload successful!",
        description: `Processed ${result.insertedDeals} deals from ${fileName}`,
      });

    } catch (error) {
      console.error('Financial upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setUploadResult({
        status: 'error',
        message: errorMessage
      });
      
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Upload Financial Data</h2>
        <p className="text-slate-600 mt-1">
          Import daily DMS Sales Analysis Detail reports to track profit and performance
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Area */}
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
                onChange={handleFileUpload}
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

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Expected Format</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-slate-600">
              <div>
                <p className="font-medium text-slate-700 mb-1">Required Columns:</p>
                <ul className="space-y-1 ml-4">
                  <li>• Age (days in inventory)</li>
                  <li>• Stock # (stock number)</li>
                  <li>• Yr Model (year/model)</li>
                  <li>• Buyer (customer name)</li>
                  <li>• Sale (sale amount)</li>
                  <li>• Cost (cost amount)</li>
                  <li>• Gross (gross profit)</li>
                  <li>• F&I (finance profit)</li>
                </ul>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-slate-500">
                  Upload your DMS Sales Analysis Detail report exactly as exported from your DMS system.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Result */}
      {uploadResult && (
        <Card className={uploadResult.status === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              {uploadResult.status === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${uploadResult.status === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                  {uploadResult.message}
                </p>
                {uploadResult.summary && (
                  <div className="mt-2 text-sm text-green-700">
                    <p>Total Units: {uploadResult.summary.totalUnits}</p>
                    <p>Total Gross: ${uploadResult.summary.totalGross?.toLocaleString()}</p>
                    <p>F&I Profit: ${uploadResult.summary.totalFiProfit?.toLocaleString()}</p>
                    <p>New/Used: {uploadResult.summary.newUnits}/{uploadResult.summary.usedUnits}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FinancialUpload;
