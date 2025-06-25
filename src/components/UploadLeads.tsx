
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Settings, Database } from "lucide-react";
import { toast } from "sonner";
import CSVFieldMapper from "@/components/CSVFieldMapper";
import UploadArea from "@/components/upload-leads/UploadArea";
import { processLeadsEnhanced, EnhancedProcessingOptions } from "@/components/upload-leads/enhancedProcessLeads";
import { parseCsvData } from "@/utils/csvParser";
import { insertLeadsBulk } from "@/utils/supabaseLeadOperations";

const UploadLeads = () => {
  const [csvData, setCsvData] = useState<any>(null);
  const [mapping, setMapping] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  
  // Enhanced processing options with flexible defaults
  const [allowPartialData, setAllowPartialData] = useState(true);
  const [updateExistingLeads, setUpdateExistingLeads] = useState(false);
  const [strictPhoneValidation, setStrictPhoneValidation] = useState(false);

  const handleFileUpload = async (files: FileList) => {
    const file = files[0];
    if (!file) return;

    try {
      setUploading(true);
      console.log('📁 [UPLOAD] Starting file processing:', file.name);
      
      // Parse CSV with enhanced error handling
      const parsedData = await parseCsvData(file);
      console.log('📊 [UPLOAD] CSV parsed successfully:', {
        rows: parsedData.rows.length,
        headers: parsedData.headers.length,
        sample: parsedData.sample
      });
      
      setCsvData(parsedData);
      toast.success(`File uploaded! Found ${parsedData.rows.length} rows`);
    } catch (error) {
      console.error('❌ [UPLOAD] File processing failed:', error);
      toast.error(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleMappingComplete = async (fieldMapping: any) => {
    if (!csvData) return;

    try {
      setUploading(true);
      console.log('🔧 [MAPPING] Starting lead processing with mapping:', fieldMapping);
      
      const processingOptions: EnhancedProcessingOptions = {
        allowPartialData,
        updateExistingLeads,
        strictPhoneValidation
      };

      console.log('⚙️ [OPTIONS] Processing with options:', processingOptions);

      // Process leads with enhanced validation and flexible options
      const processedResults = await processLeadsEnhanced(
        csvData,
        fieldMapping,
        csvData.fileName || 'upload.csv',
        csvData.fileSize || 0,
        'text/csv',
        processingOptions
      );

      console.log('📈 [PROCESSING] Processing complete:', {
        validLeads: processedResults.validLeads.length,
        duplicates: processedResults.duplicates.length,
        errors: processedResults.errors.length,
        warnings: processedResults.warnings.length
      });

      // Insert valid leads to database
      if (processedResults.validLeads.length > 0) {
        console.log('💾 [DATABASE] Inserting leads to database...');
        const insertResults = await insertLeadsBulk(processedResults.validLeads);
        console.log('✅ [DATABASE] Insertion complete:', insertResults);
        
        toast.success(
          `Successfully imported ${insertResults.successfulInserts} leads!` +
          (processedResults.warnings.length > 0 ? ` (${processedResults.warnings.length} warnings)` : '')
        );
      } else {
        toast.error('No valid leads to import. Please check your data and try again.');
      }

      setResults(processedResults);
      setMapping(fieldMapping);

    } catch (error) {
      console.error('❌ [PROCESSING] Lead processing failed:', error);
      toast.error(`Failed to process leads: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setCsvData(null);
    setMapping(null);
    setResults(null);
  };

  const getQualityScore = (lead: any) => {
    if (!lead.dataQualityScore) return 'Unknown';
    const score = lead.dataQualityScore;
    if (score >= 80) return 'High';
    if (score >= 60) return 'Medium';
    return 'Low';
  };

  const hasUsablePhone = (lead: any) => {
    return lead.phoneNumbers?.some((p: any) => p.status === 'active' || p.status === 'needs_review') || false;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Upload Leads</h1>
          <p className="text-slate-600">Import leads from CSV, Excel, or text files</p>
        </div>
        {csvData && !results && (
          <Button variant="outline" onClick={resetUpload}>
            Start Over
          </Button>
        )}
      </div>

      {!csvData ? (
        <div className="space-y-6">
          <UploadArea onFilesSelected={handleFileUpload} uploading={uploading} />
          
          {/* Advanced Options Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Import Options</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={allowPartialData}
                    onCheckedChange={(checked) => setAllowPartialData(checked === true)}
                  />
                  <div>
                    <label className="text-sm font-medium">Flexible Import Mode</label>
                    <p className="text-xs text-slate-500">Allow importing leads with data quality warnings</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={updateExistingLeads}
                    onCheckedChange={(checked) => setUpdateExistingLeads(checked === true)}
                  />
                  <div>
                    <label className="text-sm font-medium">Update Existing Leads</label>
                    <p className="text-xs text-slate-500">Update existing leads instead of marking as duplicates</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={strictPhoneValidation}
                    onCheckedChange={(checked) => setStrictPhoneValidation(checked === true)}
                  />
                  <div>
                    <label className="text-sm font-medium">Strict Phone Validation</label>
                    <p className="text-xs text-slate-500">Require valid phone numbers for all leads</p>
                  </div>
                </div>
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Recommended:</strong> Use Flexible Import Mode for best import success rates. 
                  Leads with quality issues will be flagged for manual review.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      ) : !results ? (
        <CSVFieldMapper
          csvHeaders={csvData.headers}
          sampleData={csvData.sample}
          onMappingComplete={handleMappingComplete}
        />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="w-5 h-5" />
                <span>Import Results</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{results.validLeads.length}</div>
                  <div className="text-sm text-slate-600">Valid Leads</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{results.warnings.length}</div>
                  <div className="text-sm text-slate-600">Warnings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{results.duplicates.length}</div>
                  <div className="text-sm text-slate-600">Duplicates</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{results.errors.length}</div>
                  <div className="text-sm text-slate-600">Errors</div>
                </div>
              </div>

              {results.validLeads.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium">Successfully Imported Leads</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {results.validLeads.slice(0, 10).map((lead: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded text-sm">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>{lead.firstName} {lead.lastName}</span>
                          <span className="text-slate-500">({lead.primaryPhone})</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getQualityScore(lead) === 'High' ? 'default' : getQualityScore(lead) === 'Medium' ? 'secondary' : 'destructive'}>
                            {getQualityScore(lead)} Quality
                          </Badge>
                          {!hasUsablePhone(lead) && (
                            <Badge variant="outline">No Phone</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {results.validLeads.length > 10 && (
                      <div className="text-center text-sm text-slate-500 py-2">
                        ...and {results.validLeads.length - 10} more leads
                      </div>
                    )}
                  </div>
                </div>
              )}

              {results.warnings.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium">Data Quality Warnings</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {results.warnings.slice(0, 5).map((warning: any, index: number) => (
                      <div key={index} className="flex items-start space-x-2 p-2 bg-yellow-50 rounded text-sm">
                        <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium">Row {warning.rowIndex}</div>
                          <div className="text-slate-600">{warning.warning}</div>
                        </div>
                      </div>
                    ))}
                    {results.warnings.length > 5 && (
                      <div className="text-center text-sm text-slate-500 py-2">
                        ...and {results.warnings.length - 5} more warnings
                      </div>
                    )}
                  </div>
                </div>
              )}

              {results.errors.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium">Import Errors</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {results.errors.slice(0, 5).map((error: any, index: number) => (
                      <div key={index} className="flex items-start space-x-2 p-2 bg-red-50 rounded text-sm">
                        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium">Row {error.rowIndex}</div>
                          <div className="text-slate-600">{error.error}</div>
                        </div>
                      </div>
                    ))}
                    {results.errors.length > 5 && (
                      <div className="text-center text-sm text-slate-500 py-2">
                        ...and {results.errors.length - 5} more errors
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex space-x-2 pt-4">
                <Button onClick={resetUpload}>
                  Import Another File
                </Button>
                <Button variant="outline" asChild>
                  <a href="/leads">View All Leads</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default UploadLeads;
