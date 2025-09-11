import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle, AlertCircle, FileText, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import CSVFieldMapper from "./CSVFieldMapper";
import { parseEnhancedInventoryFile } from "@/utils/enhancedFileParsingUtils";
import { processLeads } from "./upload-leads/processLeads";
import { FieldMapping } from "./csv-mapper/types";
import { toast } from "@/hooks/use-toast";
import SimpleUploadArea from './leads/SimpleUploadArea';
import LeadUploadInfoCard from './leads/LeadUploadInfoCard';
import LeadUploadResult from './leads/LeadUploadResult';

interface CSVData {
  headers: string[];
  rows: Record<string, string>[];
}

interface UploadResult {
  success: boolean;
  totalProcessed: number;
  successfulInserts: number;
  errors: any[];
  duplicates: any[];
  message: string;
  timestamp: string;
}

type UploadStage = 'upload' | 'mapping' | 'processing' | 'results';

interface LeadUploadCenterProps {
  user: {
    id: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
  };
}

const LeadUploadCenter = ({ user }: LeadUploadCenterProps) => {
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [currentStage, setCurrentStage] = useState<UploadStage>('upload');
  const [processing, setProcessing] = useState(false);

  // Current lead count (mock data - replace with real data)
  const currentLeadCount = 1250;

  const handleFileSelected = useCallback(async (file: File) => {
    if (!file) return;

    console.log('Processing file:', file.name);
    setCurrentStage('mapping');
    setProcessing(true);

    try {
      const parsedData = await parseEnhancedInventoryFile(file);
      const csvData = {
        headers: parsedData.headers,
        rows: parsedData.rows
      };

      console.log('File processed:', {
        headers: csvData.headers.length,
        rows: csvData.rows.length
      });

      setCsvData(csvData);
      
      toast({
        title: "File processed successfully",
        description: `Found ${csvData.rows.length} rows with ${csvData.headers.length} columns.`,
      });
      
    } catch (error) {
      console.error('File processing error:', error);
      toast({
        title: "File processing failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
      setCurrentStage('upload');
    } finally {
      setProcessing(false);
    }
  }, []);

  const handleMappingComplete = async (mapping: FieldMapping) => {
    if (!csvData) return;

    console.log('Starting lead processing with mapping:', mapping);
    setCurrentStage('processing');
    setProcessing(true);

    try {
      // Process leads using the field mapping
      const processResult = processLeads(csvData, mapping);
      
      console.log('Processing result:', {
        validLeads: processResult.validLeads.length,
        duplicates: processResult.duplicates.length,
        errors: processResult.errors.length
      });

      // Simulate upload (replace with actual upload logic)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock successful upload result
      const result: UploadResult = {
        success: true,
        totalProcessed: processResult.validLeads.length,
        successfulInserts: processResult.validLeads.length,
        errors: processResult.errors,
        duplicates: processResult.duplicates,
        message: 'Leads uploaded successfully',
        timestamp: new Date().toISOString()
      };

      setUploadResult(result);
      setCurrentStage('results');

      toast({
        title: "Upload completed",
        description: `Successfully uploaded ${result.successfulInserts} leads.`,
      });

    } catch (error) {
      console.error('Upload processing error:', error);
      const errorResult: UploadResult = {
        success: false,
        totalProcessed: 0,
        successfulInserts: 0,
        errors: [{ error: error instanceof Error ? error.message : 'Unknown error' }],
        duplicates: [],
        message: 'Upload failed',
        timestamp: new Date().toISOString()
      };

      setUploadResult(errorResult);
      setCurrentStage('results');

      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const resetUpload = () => {
    setCsvData(null);
    setUploadResult(null);
    setCurrentStage('upload');
    setProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Lead Upload Center</h1>
          <p className="text-muted-foreground">
            Upload CSV files with intelligent field mapping and duplicate detection
          </p>
        </div>

        {/* Current Status */}
        <Card className="bg-card shadow-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium flex items-center space-x-2 text-card-foreground">
              <Users className="h-5 w-5 text-primary" />
              <span>Current Database</span>
            </CardTitle>
            <FileText className="h-8 w-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{currentLeadCount.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Total leads in system
            </p>
          </CardContent>
        </Card>

        {/* Processing Alert */}
        <Alert className="border-primary/20 bg-primary/5">
          <Upload className="h-4 w-4 text-primary" />
          <AlertDescription className="text-primary/80">
            <strong>Smart Processing:</strong> Automatically maps fields, detects duplicates, 
            validates data quality, and processes lead information.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Upload Flow */}
          <div className="lg:col-span-2 space-y-6">
            {currentStage === 'upload' && (
              <SimpleUploadArea 
                onFileSelected={handleFileSelected}
                processing={processing}
              />
            )}

            {currentStage === 'mapping' && csvData && (
              <CSVFieldMapper
                csvHeaders={csvData.headers}
                sampleData={csvData.rows[0] || {}}
                onMappingComplete={handleMappingComplete}
              />
            )}

            {currentStage === 'processing' && (
              <Card className="bg-card shadow-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-card-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span>Processing Leads</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Validating data, checking for duplicates, and uploading to database...
                  </p>
                </CardContent>
              </Card>
            )}

            {currentStage === 'results' && uploadResult && (
              <LeadUploadResult 
                result={uploadResult}
                onUploadAnother={resetUpload}
              />
            )}
          </div>

          {/* Info Panel */}
          <div className="space-y-6">
            <LeadUploadInfoCard />
            
            {/* Progress Steps */}
            <Card className="bg-card shadow-card border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground">Upload Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className={`flex items-center space-x-2 ${currentStage === 'upload' ? 'text-primary' : 'text-muted-foreground'}`}>
                  {currentStage !== 'upload' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-current" />
                  )}
                  <span className="text-sm">1. Select CSV file</span>
                </div>
                <div className={`flex items-center space-x-2 ${currentStage === 'mapping' ? 'text-primary' : ['processing', 'results'].includes(currentStage) ? 'text-muted-foreground' : 'text-muted-foreground opacity-50'}`}>
                  {['processing', 'results'].includes(currentStage) ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : currentStage === 'mapping' ? (
                    <div className="h-4 w-4 rounded-full bg-primary" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-current opacity-50" />
                  )}
                  <span className="text-sm">2. Map fields</span>
                </div>
                <div className={`flex items-center space-x-2 ${currentStage === 'processing' ? 'text-primary' : currentStage === 'results' ? 'text-muted-foreground' : 'text-muted-foreground opacity-50'}`}>
                  {currentStage === 'results' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : currentStage === 'processing' ? (
                    <div className="h-4 w-4 rounded-full bg-primary animate-pulse" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-current opacity-50" />
                  )}
                  <span className="text-sm">3. Process & upload</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadUploadCenter;