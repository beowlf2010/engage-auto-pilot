import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import UploadArea from "@/components/upload-leads/UploadArea";
import ImportFeaturesCard from "@/components/upload-leads/ImportFeaturesCard";
import PhonePriorityCard from "@/components/upload-leads/PhonePriorityCard";
import CSVTemplateCard from "@/components/upload-leads/CSVTemplateCard";
import UploadInfoPanel from "@/components/leads/upload/UploadInfoPanel";
import EnhancedBypassUploadButton from "@/components/upload-leads/EnhancedBypassUploadButton";
import { useCSVUpload } from "@/hooks/useCSVUpload";
import { useEnhancedUserProfile } from "@/hooks/useEnhancedUserProfile";

const UploadLeadsPage = () => {
  const [updateExistingLeads, setUpdateExistingLeads] = useState(false);
  const { 
    uploading, 
    uploadResult, 
    processedData,
    handleFileUpload, 
    clearResults 
  } = useCSVUpload();
  
  const { userProfile, loading: profileLoading } = useEnhancedUserProfile();

  const handleFilesSelected = (files: FileList) => {
    console.log('🔥 [UPLOAD PAGE] handleFilesSelected called with files:', files.length);
    if (files.length > 0) {
      console.log('🔥 [UPLOAD PAGE] Calling handleFileUpload for:', files[0].name);
      handleFileUpload(files[0], updateExistingLeads);
    }
  };

  console.log('🔍 [UPLOAD PAGE] Current state:', {
    uploading,
    hasUploadResult: !!uploadResult,
    hasProcessedData: !!processedData,
    processedLeadsCount: processedData?.processedLeads?.length || 0
  });

  if (profileLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading user profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile || !['manager', 'admin'].includes(userProfile.role)) {
    return (
      <div className="container mx-auto py-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Manager or Admin access required to upload leads.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Upload Leads</h1>
          <p className="text-slate-600 mt-1">
            Import leads from CSV or Excel files with intelligent field mapping
          </p>
        </div>
        {uploadResult && (
          <Button onClick={clearResults} variant="outline">
            Clear Results
          </Button>
        )}
      </div>

      <UploadInfoPanel updateExistingLeads={updateExistingLeads} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <UploadArea
            onFilesSelected={handleFilesSelected}
            uploading={uploading}
          />

          {/* Upload Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="updateExisting"
                    checked={updateExistingLeads}
                    onCheckedChange={(checked) => setUpdateExistingLeads(checked as boolean)}
                  />
                  <label
                    htmlFor="updateExisting"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Update existing leads instead of skipping duplicates
                  </label>
                </div>
                
                {processedData && processedData.processedLeads.length > 0 && (
                  <div className="pt-4 border-t bg-green-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-800">
                          ✅ CSV Processed Successfully!
                        </p>
                        <p className="text-sm text-green-600">
                          {processedData.processedLeads.length} leads ready for enhanced bypass upload
                        </p>
                        {processedData.duplicates.length > 0 && (
                          <p className="text-xs text-orange-600">
                            {processedData.duplicates.length} potential duplicates detected in CSV
                          </p>
                        )}
                        {processedData.errors.length > 0 && (
                          <p className="text-xs text-red-600">
                            {processedData.errors.length} rows had errors
                          </p>
                        )}
                        <p className="text-xs text-blue-600 mt-1">
                          ℹ️ Database duplicate check will be performed before upload
                        </p>
                      </div>
                      <EnhancedBypassUploadButton 
                        leads={processedData.processedLeads}
                        disabled={uploading}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upload Results */}
          {uploadResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="w-5 h-5" />
                  <span>Upload Results</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-blue-50 p-3 rounded">
                      <div className="text-2xl font-bold text-blue-600">
                        {uploadResult.totalProcessed}
                      </div>
                      <div className="text-sm text-blue-600">Processed</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <div className="text-2xl font-bold text-green-600">
                        {uploadResult.successfulInserts}
                      </div>
                      <div className="text-sm text-green-600">Successful</div>
                    </div>
                    <div className="bg-red-50 p-3 rounded">
                      <div className="text-2xl font-bold text-red-600">
                        {uploadResult.errors?.length || 0}
                      </div>
                      <div className="text-sm text-red-600">Errors</div>
                    </div>
                  </div>
                  
                  {uploadResult.errors && uploadResult.errors.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-red-800 mb-2">Errors:</h4>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {uploadResult.errors.map((error, index) => (
                          <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                            Row {error.rowIndex}: {error.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <ImportFeaturesCard />
          <PhonePriorityCard />
          <CSVTemplateCard />
        </div>
      </div>
    </div>
  );
};

export default UploadLeadsPage;
