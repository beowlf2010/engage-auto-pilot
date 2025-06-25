
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, CheckCircle, Upload, Settings, Database } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { parseCSVFile, ParsedCSVData } from "@/utils/csvParser";
import { insertLeadsToDatabase, BulkInsertOptions } from "@/utils/supabaseLeadOperations";
import { processLeadsEnhanced, EnhancedProcessingOptions } from "./upload-leads/enhancedProcessLeads";
import CSVFieldMapper from './CSVFieldMapper';
import UploadArea from './upload-leads/UploadArea';
import { FieldMapping } from './csv-mapper/types';

interface UploadLeadsProps {
  onUploadComplete?: () => void;
}

const UploadLeads = ({ onUploadComplete }: UploadLeadsProps) => {
  const [csvData, setCsvData] = useState<ParsedCSVData | null>(null);
  const [mapping, setMapping] = useState<FieldMapping | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<'upload' | 'map' | 'process' | 'complete'>('upload');
  
  // Enhanced processing options
  const [updateExistingLeads, setUpdateExistingLeads] = useState(false);
  const [allowPartialData, setAllowPartialData] = useState(true);
  const [strictPhoneValidation, setStrictPhoneValidation] = useState(false);

  const handleFileUpload = async (files: FileList) => {
    const file = files[0];
    if (!file) return;

    try {
      setUploading(true);
      console.log(`📁 [FILE UPLOAD] Processing file: ${file.name} (${file.size} bytes)`);
      
      const parsed = await parseCSVFile(file);
      setCsvData(parsed);
      setCurrentStep('map');
      
      console.log(`✅ [FILE UPLOAD] File parsed successfully: ${parsed.rows.length} rows, ${parsed.headers.length} columns`);
      
      toast({
        title: "File uploaded successfully",
        description: `Found ${parsed.rows.length} rows with ${parsed.headers.length} columns`,
      });
    } catch (error) {
      console.error('❌ [FILE UPLOAD] CSV parsing error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to parse CSV file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleMappingComplete = (fieldMapping: FieldMapping) => {
    console.log('🗺️ [FIELD MAPPING] Field mapping completed:', fieldMapping);
    setMapping(fieldMapping);
    setCurrentStep('process');
  };

  const handleProcessLeads = async () => {
    if (!csvData || !mapping) {
      console.error('❌ [PROCESS LEADS] Missing required data');
      return;
    }

    try {
      setUploading(true);
      
      console.log('🚀 [PROCESS LEADS] Starting lead processing with enhanced validation');
      
      // Enhanced processing options
      const processingOptions: EnhancedProcessingOptions = {
        updateExistingLeads,
        allowPartialData,
        strictPhoneValidation
      };

      console.log('🚀 [PROCESS LEADS] Processing options:', processingOptions);

      // Process leads with enhanced validation
      const processResult = await processLeadsEnhanced(
        csvData,
        mapping,
        'uploaded-file.csv',
        0,
        'text/csv',
        processingOptions
      );

      console.log('📊 [PROCESS LEADS] Processing completed:', {
        validLeads: processResult.validLeads.length,
        duplicates: processResult.duplicates.length,
        errors: processResult.errors.length,
        warnings: processResult.warnings.length
      });

      // Insert leads to database with enhanced error handling
      const bulkOptions: BulkInsertOptions = {
        updateExistingLeads,
        allowPartialData
      };

      console.log('💾 [PROCESS LEADS] Starting database insertion');
      
      const insertResult = await insertLeadsToDatabase(
        processResult.validLeads,
        processResult.uploadHistoryId,
        bulkOptions
      );

      console.log('✅ [PROCESS LEADS] Database insertion completed:', {
        successfulInserts: insertResult.successfulInserts,
        errors: insertResult.errors.length,
        duplicates: insertResult.duplicates.length
      });

      setUploadResult({
        processResult,
        insertResult,
        totalProcessed: csvData.rows.length,
        successfulImports: insertResult.successfulInserts,
        failedImports: insertResult.errors.length,
        duplicateImports: insertResult.duplicates.length,
        warnings: processResult.warnings,
        processingErrors: processResult.errors
      });

      setCurrentStep('complete');
      
      // Show appropriate toast based on results
      if (insertResult.successfulInserts > 0) {
        toast({
          title: "Import completed",
          description: `Successfully imported ${insertResult.successfulInserts} leads`,
        });
      } else {
        toast({
          title: "Import failed",
          description: `No leads were imported. Please check the data and try again.`,
          variant: "destructive",
        });
      }

      onUploadComplete?.();
    } catch (error) {
      console.error('💥 [PROCESS LEADS] Critical error during lead processing:', error);
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "Failed to process leads",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    console.log('🔄 [RESET] Resetting upload process');
    setCsvData(null);
    setMapping(null);
    setUploadResult(null);
    setCurrentStep('upload');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Upload Leads</h2>
          <p className="text-slate-600 mt-1">
            Import leads from CSV files with enhanced validation and comprehensive error reporting
          </p>
        </div>
        {currentStep !== 'upload' && (
          <Button onClick={resetUpload} variant="outline">
            Upload New File
          </Button>
        )}
      </div>

      {/* Processing Options */}
      {currentStep === 'process' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Processing Options</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="updateExisting"
                  checked={updateExistingLeads}
                  onCheckedChange={(checked) => setUpdateExistingLeads(checked === true)}
                />
                <label htmlFor="updateExisting" className="text-sm font-medium">
                  Update existing leads
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allowPartial"
                  checked={allowPartialData}
                  onCheckedChange={(checked) => setAllowPartialData(checked === true)}
                />
                <label htmlFor="allowPartial" className="text-sm font-medium">
                  Allow partial data (Recommended)
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="strictPhone"
                  checked={strictPhoneValidation}
                  onCheckedChange={(checked) => setStrictPhoneValidation(checked === true)}
                />
                <label htmlFor="strictPhone" className="text-sm font-medium">
                  Strict phone validation
                </label>
              </div>
            </div>
            
            <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
              <p><strong>Flexible Mode (Recommended):</strong> Imports leads with validation warnings instead of rejecting them entirely. This maximizes successful imports while flagging data quality issues for review.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step Content */}
      {currentStep === 'upload' && (
        <UploadArea onFilesSelected={handleFileUpload} uploading={uploading} />
      )}

      {currentStep === 'map' && csvData && (
        <CSVFieldMapper 
          csvHeaders={csvData.headers}
          sampleData={csvData.sample}
          onMappingComplete={handleMappingComplete}
        />
      )}

      {currentStep === 'process' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="w-5 h-5" />
              <span>Ready to Process</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>Total rows to process:</span>
                <Badge variant="secondary">{csvData?.rows.length || 0}</Badge>
              </div>
              
              <Button onClick={handleProcessLeads} disabled={uploading} className="w-full">
                {uploading ? 'Processing and Inserting...' : 'Process and Import Leads'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 'complete' && uploadResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Import Complete</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {uploadResult.successfulImports}
                  </div>
                  <div className="text-sm text-slate-600">Successfully Imported</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {uploadResult.failedImports}
                  </div>
                  <div className="text-sm text-slate-600">Failed to Import</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {uploadResult.duplicateImports}
                  </div>
                  <div className="text-sm text-slate-600">Duplicates Skipped</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {uploadResult.warnings?.length || 0}
                  </div>
                  <div className="text-sm text-slate-600">Data Quality Warnings</div>
                </div>
              </div>

              {/* Show detailed results */}
              {uploadResult.warnings && uploadResult.warnings.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {uploadResult.warnings.length} leads imported with data quality warnings. 
                    Review these leads for potential phone number or data issues.
                  </AlertDescription>
                </Alert>
              )}

              {uploadResult.processingErrors && uploadResult.processingErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {uploadResult.processingErrors.length} leads failed during processing. 
                    Check the data format and required fields.
                  </AlertDescription>
                </Alert>
              )}

              {uploadResult.successfulImports === 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No leads were successfully imported. Please check your data format, 
                    ensure required fields are mapped correctly, and verify phone number formats.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UploadLeads;
