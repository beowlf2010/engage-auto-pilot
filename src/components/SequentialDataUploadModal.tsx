import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Upload, ArrowRight, RotateCcw, AlertTriangle, ArrowLeft, Bug, Zap, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useEnhancedMultiFileUpload } from '@/hooks/useEnhancedMultiFileUpload';
import { useEnhancedFinancialUpload } from '@/hooks/useEnhancedFinancialUpload';
import { useMultiFileLeadUpload } from '@/hooks/useMultiFileLeadUpload';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import LeadBatchUploadResult from '@/components/leads/LeadBatchUploadResult';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SequentialDataUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess?: () => void;
}

type UploadStep = {
  id: number;
  title: string;
  description: string;
  fileType: 'inventory' | 'financial' | 'leads';
  condition?: 'used' | 'new';
};

const uploadSteps: UploadStep[] = [
  {
    id: 1,
    title: "Upload Used Car Inventory",
    description: "Upload your used vehicle inventory file (.csv, .xlsx, .xls)",
    fileType: 'inventory',
    condition: 'used'
  },
  {
    id: 2,
    title: "Upload New Car Inventory", 
    description: "Upload your new vehicle inventory file (.csv, .xlsx, .xls)",
    fileType: 'inventory',
    condition: 'new'
  },
  {
    id: 3,
    title: "Upload Sales Data",
    description: "Upload your month-to-date sales data (.xlsx, .xls)",
    fileType: 'financial'
  },
  {
    id: 4,
    title: "Upload Recent Leads",
    description: "Upload your recent leads file (.csv, .xlsx, .xls)",
    fileType: 'leads'
  }
];

const SequentialDataUploadModal = ({ isOpen, onClose, userId, onSuccess }: SequentialDataUploadModalProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [stepResults, setStepResults] = useState<Record<number, any>>({});
  const [isNavigating, setIsNavigating] = useState(false);
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());
  
  // Enhanced debugging and fallback state
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [canManuallyAdvance, setCanManuallyAdvance] = useState(false);
  const [uploadAttempts, setUploadAttempts] = useState<Record<number, number>>({});
  const [processingDetails, setProcessingDetails] = useState<{
    stage: string;
    progress: number;
    details: string;
  }>({ stage: 'idle', progress: 0, details: '' });
  
  const { toast } = useToast();

  // Upload hooks with enhanced functionality
  const inventoryUpload = useEnhancedMultiFileUpload({ userId, duplicateStrategy: 'skip' });
  const financialUpload = useEnhancedFinancialUpload(userId);
  const leadUpload = useMultiFileLeadUpload();

  // Enhanced debugging helper functions
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log('🔍 DEBUG:', logMessage);
    setDebugLogs(prev => [...prev.slice(-19), logMessage]); // Keep last 20 logs
  };

  const updateProcessingDetails = (stage: string, progress: number, details: string) => {
    setProcessingDetails({ stage, progress, details });
    addDebugLog(`Stage: ${stage} (${progress}%) - ${details}`);
  };

  const validateUploadChain = async (step: UploadStep, files: FileList) => {
    addDebugLog(`🔍 Validating upload chain for ${step.title}`);
    
    // Step 1: File validation
    updateProcessingDetails('validation', 10, 'Validating file format and size');
    if (!files || files.length === 0) {
      throw new Error('No files selected');
    }
    
    const file = files[0];
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      throw new Error('File size exceeds 50MB limit');
    }
    
    // Step 2: File type validation
    updateProcessingDetails('validation', 30, 'Checking file type compatibility');
    const allowedTypes = step.fileType === 'financial' 
      ? ['.xlsx', '.xls'] 
      : ['.csv', '.xlsx', '.xls'];
    
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedTypes.includes(fileExtension)) {
      throw new Error(`Invalid file type. Expected: ${allowedTypes.join(', ')}`);
    }
    
    // Step 3: Hook validation
    updateProcessingDetails('validation', 50, 'Validating upload hooks');
    switch (step.fileType) {
      case 'inventory':
        if (!inventoryUpload) throw new Error('Inventory upload hook not available');
        break;
      case 'financial':
        if (!financialUpload) throw new Error('Financial upload hook not available');
        break;
      case 'leads':
        if (!leadUpload) throw new Error('Lead upload hook not available');
        break;
    }
    
    updateProcessingDetails('validation', 100, 'Validation complete');
    addDebugLog(`✅ Upload chain validation passed for ${step.title}`);
    return true;
  };

  const attemptUploadWithFallbacks = async (step: UploadStep, files: FileList) => {
    const stepAttempts = uploadAttempts[step.id] || 0;
    setUploadAttempts(prev => ({ ...prev, [step.id]: stepAttempts + 1 }));
    
    addDebugLog(`🚀 Starting upload attempt #${stepAttempts + 1} for ${step.title}`);
    
    try {
      // Pre-upload validation
      await validateUploadChain(step, files);
      
      // Main upload logic with enhanced error handling
      if (step.fileType === 'inventory' && step.condition) {
        return await handleInventoryUpload(step, files);
      } else if (step.fileType === 'financial') {
        return await handleFinancialUpload(step, files);
      } else if (step.fileType === 'leads') {
        return await handleLeadUpload(step, files);
      }
      
    } catch (error) {
      addDebugLog(`❌ Upload attempt #${stepAttempts + 1} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Enable manual advance after 2 failed attempts
      if (stepAttempts >= 1) {
        setCanManuallyAdvance(true);
        addDebugLog(`🎯 Manual advance enabled after ${stepAttempts + 1} failed attempts`);
      }
      
      throw error;
    }
  };

  const handleInventoryUpload = async (step: UploadStep, files: FileList) => {
    updateProcessingDetails('processing', 20, 'Converting files to queue format');
    
    const queuedFiles = Array.from(files).map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      condition: step.condition as 'new' | 'used' | 'gm_global',
      status: 'pending' as const
    }));
    
    addDebugLog(`📋 Created ${queuedFiles.length} queued files`);
    updateProcessingDetails('processing', 40, 'Starting batch processing');
    
    const result = await inventoryUpload.processBatch(queuedFiles);
    addDebugLog(`📊 Batch result: ${result.successfulFiles}/${result.totalFiles} files successful`);
    
    updateProcessingDetails('validation', 80, 'Validating results');
    
    if (result && result.successfulFiles > 0) {
      updateProcessingDetails('completion', 100, 'Upload completed successfully');
      addDebugLog(`✅ Force completing step due to successful upload`);
      
      // Multiple completion paths for reliability
      setTimeout(() => handleStepComplete(result), 100);  // Fallback 1
      setTimeout(() => handleStepComplete(result), 500);  // Fallback 2
      
      return result;
    } else {
      throw new Error(`Upload failed: ${result.failedFiles} files failed, ${result.successfulFiles} succeeded`);
    }
  };

  const handleFinancialUpload = async (step: UploadStep, files: FileList) => {
    updateProcessingDetails('processing', 20, 'Preparing financial files');
    
    const fileArray = Array.from(files);
    const queuedFiles = fileArray.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      status: 'pending' as const
    }));
    
    addDebugLog(`💰 Adding ${queuedFiles.length} financial files to queue`);
    updateProcessingDetails('processing', 50, 'Processing financial data');
    
    addFinancialFiles(queuedFiles);
    const result = await processFinancialBatch();
    
    addDebugLog(`💰 Financial processing result: ${JSON.stringify(result)}`);
    updateProcessingDetails('completion', 100, 'Financial upload completed');
    
    return result;
  };

  const handleLeadUpload = async (step: UploadStep, files: FileList) => {
    updateProcessingDetails('processing', 30, 'Processing lead files');
    
    addDebugLog(`👥 Processing ${files.length} lead files directly`);
    
    // Create queued files directly to avoid race condition
    const queuedFiles = Array.from(files).map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      status: 'pending' as const
    }));
    
    updateProcessingDetails('processing', 70, 'Batch processing leads');
    const result = await processLeadBatch(queuedFiles);
    
    addDebugLog(`👥 Lead processing result: ${JSON.stringify(result)}`);
    
    if (result) {
      updateProcessingDetails('completion', 100, 'Lead upload completed');
      handleStepComplete(result);
      return result;
    } else {
      throw new Error('Lead processing returned no result');
    }
  };

  const forceAdvanceStep = () => {
    addDebugLog(`⚡ MANUAL ADVANCE: Forcing completion of step ${currentStep}`);
    
    const mockResult = {
      totalFiles: 1,
      successfulFiles: 1,
      totalRecords: 1,
      successfulRecords: 1,
      message: 'Manually advanced due to upload issues'
    };
    
    handleStepComplete(mockResult);
    setCanManuallyAdvance(false);
    setUploadAttempts(prev => ({ ...prev, [currentStep]: 0 }));
    
    toast({
      title: "Step Advanced Manually",
      description: "Step completed manually after upload issues. You may need to re-upload this data later.",
      variant: "default"
    });
  };

  const { addFiles: addFinancialFiles, processBatch: processFinancialBatch, batchResult: financialResult, uploading: financialUploading, resetState: resetFinancialState } = financialUpload;
  const { addFiles: addLeadFiles, processBatch: processLeadBatch, batchResult: leadResult, resetState: resetLeadState } = leadUpload;

  const currentStepData = uploadSteps.find(step => step.id === currentStep);
  const progress = (completedSteps.size / uploadSteps.length) * 100;
  const isComplete = completedSteps.size === uploadSteps.length;

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const step = currentStepData!;
    setUploadStatus(`Starting upload for ${step.title}`);
    addDebugLog(`🔄 File selected: ${files[0].name} for step: ${step.title}`);
    
    try {
      // Use enhanced upload with fallbacks
      const result = await attemptUploadWithFallbacks(step, files);
      
      if (result) {
        setUploadStatus('Upload completed successfully');
        addDebugLog(`✅ Upload completed successfully for ${step.title}`);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setUploadStatus(`Upload failed: ${errorMessage}`);
      addDebugLog(`❌ Upload failed for ${step.title}: ${errorMessage}`);
      
      toast({
        title: "Upload Failed",
        description: `${errorMessage}${canManuallyAdvance ? '. Manual advance available.' : ''}`,
        variant: "destructive"
      });
    }

    // Reset input
    event.target.value = '';
  };

  const handleStepComplete = (result: any) => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    setStepResults(prev => ({ ...prev, [currentStep]: result }));
    
    // Auto-expand results for the just completed step
    setExpandedResults(prev => new Set([...prev, currentStep]));
    
    if (currentStep < uploadSteps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const toggleResultExpansion = (stepId: number) => {
    setExpandedResults(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  const renderStepResult = (step: UploadStep, result: any) => {
    if (!result) return null;

    const isExpanded = expandedResults.has(step.id);
    
    // Format result summary based on step type
    let summary = '';
    let hasIssues = false;
    
    if (step.fileType === 'leads') {
      summary = `${result.successfulLeads || 0} imported, ${result.failedLeads || 0} failed, ${result.duplicateLeads || 0} duplicates`;
      hasIssues = result.failedLeads > 0 || result.duplicateLeads > 0;
    } else if (step.fileType === 'inventory') {
      summary = `${result.successfulFiles || 0}/${result.totalFiles || 0} files processed successfully`;
      hasIssues = (result.failedFiles || 0) > 0;
    } else if (step.fileType === 'financial') {
      summary = `${result.successfulRecords || 0} records processed`;
      hasIssues = (result.failedRecords || 0) > 0;
    }

    return (
      <Card key={`result-${step.id}`} className={`mt-2 ${hasIssues ? 'border-yellow-200 bg-yellow-50' : 'border-green-200 bg-green-50'}`}>
        <Collapsible open={isExpanded} onOpenChange={() => toggleResultExpansion(step.id)}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-opacity-80 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Results: {summary}</span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {step.fileType === 'leads' && (
                <LeadBatchUploadResult 
                  result={result} 
                  onClose={() => toggleResultExpansion(step.id)}
                  onViewLeads={() => {
                    onClose();
                    // Navigate to leads view if needed
                  }}
                />
              )}
              {step.fileType === 'inventory' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Total Files:</span> {result.totalFiles || 0}
                    </div>
                    <div>
                      <span className="font-medium">Successful:</span> {result.successfulFiles || 0}
                    </div>
                    <div>
                      <span className="font-medium">Failed:</span> {result.failedFiles || 0}
                    </div>
                  </div>
                  {result.details && (
                    <div className="text-xs text-gray-600 mt-2">
                      {result.details}
                    </div>
                  )}
                </div>
              )}
              {step.fileType === 'financial' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Records Processed:</span> {result.successfulRecords || 0}
                    </div>
                    <div>
                      <span className="font-medium">Failed:</span> {result.failedRecords || 0}
                    </div>
                  </div>
                  {result.message && (
                    <div className="text-xs text-gray-600 mt-2">
                      {result.message}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  // Watch for inventory upload completion
  useEffect(() => {
    if (currentStepData?.fileType === 'inventory' && inventoryUpload.batchResult && !inventoryUpload.processing) {
      if (inventoryUpload.batchResult.successfulFiles > 0) {
        handleStepComplete(inventoryUpload.batchResult);
      }
    }
  }, [inventoryUpload.batchResult, inventoryUpload.processing, currentStepData?.fileType]);

  // Watch for financial upload completion with proper dependencies
  useEffect(() => {
    addDebugLog(`🔍 Financial upload watcher triggered - Step: ${currentStepData?.fileType}, Result: ${!!financialResult}, Uploading: ${financialUploading}, Current Step: ${currentStep}`);
    
    if (currentStepData?.fileType === 'financial' && financialResult && !financialUploading) {
      addDebugLog(`✅ Financial upload complete - handling step completion`);
      handleStepComplete(financialResult);
    }
  }, [financialResult, financialUploading, currentStepData?.fileType, currentStep, completedSteps]);

  const handleNext = () => {
    if (currentStep < uploadSteps.length && !isNavigating) {
      setIsNavigating(true);
      setCurrentStep(currentStep + 1);
      setTimeout(() => setIsNavigating(false), 100);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1 && !isNavigating) {
      setIsNavigating(true);
      
      // Clear upload state for the current step being left
      const currentStepData = uploadSteps.find(step => step.id === currentStep);
      if (currentStepData) {
        switch (currentStepData.fileType) {
          case 'inventory':
            inventoryUpload.setBatchResult(null);
            break;
          case 'financial':
            resetFinancialState();
            break;
          case 'leads':
            resetLeadState();
            break;
        }
      }

      // Remove completion status for steps after the one we're going back to
      const targetStep = currentStep - 1;
      setCompletedSteps(prev => {
        const newCompleted = new Set(prev);
        for (let step = targetStep + 1; step <= uploadSteps.length; step++) {
          newCompleted.delete(step);
        }
        return newCompleted;
      });

      // Clear results for future steps
      setStepResults(prev => {
        const newResults = { ...prev };
        for (let step = targetStep + 1; step <= uploadSteps.length; step++) {
          delete newResults[step];
        }
        return newResults;
      });

      setCurrentStep(targetStep);
      setTimeout(() => setIsNavigating(false), 100);
    }
  };

  const handleRestart = () => {
    setIsNavigating(true);
    
    // Reset all upload hook states
    inventoryUpload.setBatchResult(null);
    resetFinancialState();
    resetLeadState();
    
    // Reset component state
    setCurrentStep(1);
    setCompletedSteps(new Set());
    setStepResults({});
    setShowRestartDialog(false);
    
    setTimeout(() => setIsNavigating(false), 100);
  };

  const isCurrentStepCompleted = completedSteps.has(currentStep);
  const canProceed = isCurrentStepCompleted || currentStep === 1;

  // Check if current upload is in progress
  const isUploading = inventoryUpload.processing || financialUploading || leadUpload.processing;

  if (isComplete) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <span>Sequential Upload Complete!</span>
            </DialogTitle>
          </DialogHeader>
          
            <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {uploadSteps.map((step) => {
                const result = stepResults[step.id];
                const isExpanded = expandedResults.has(step.id);
                
                return (
                  <Card key={step.id} className="border-green-200">
                    <Collapsible open={isExpanded} onOpenChange={() => toggleResultExpansion(step.id)}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-green-100/50 pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span>{step.title}</span>
                            </CardTitle>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground text-left">
                            {step.fileType === 'leads' && result ? 
                              `${result.successfulLeads || 0} leads imported, ${result.failedLeads || 0} failed` :
                              step.fileType === 'inventory' && result ?
                              `${result.successfulFiles || 0}/${result.totalFiles || 0} files processed` :
                              step.fileType === 'financial' && result ?
                              `${result.successfulRecords || 0} records processed` :
                              'Completed'
                            }
                          </p>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          {renderStepResult(step, result)}
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                );
              })}
            </div>
            
            <div className="flex justify-between">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Start Over
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center space-x-2">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      <span>Start Over?</span>
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will clear all completed uploads and return you to the first step. 
                      Your data will remain in the system, but you'll need to re-upload if you want to make changes.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRestart}>
                      Start Over
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button onClick={() => { onSuccess?.(); onClose(); }}>
                View Results
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sequential Data Upload</DialogTitle>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Step {currentStep} of {uploadSteps.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Step */}
          <Card className={`border-2 ${isCurrentStepCompleted ? 'border-green-500' : 'border-primary'}`}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {isCurrentStepCompleted && <CheckCircle className="w-5 h-5 text-green-600" />}
                <span>{currentStepData?.title}</span>
              </CardTitle>
              <CardDescription>{currentStepData?.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {!isCurrentStepCompleted ? (
                <div className="space-y-4">
                  <input
                    type="file"
                    accept={currentStepData?.fileType === 'financial' ? '.xlsx,.xls' : '.csv,.xlsx,.xls'}
                    multiple={currentStepData?.fileType === 'leads'}
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="hidden"
                    id={`file-input-${currentStep}`}
                  />
                  <Button 
                    asChild 
                    disabled={isUploading}
                    className="w-full"
                  >
                    <label htmlFor={`file-input-${currentStep}`} className="cursor-pointer">
                      <Upload className="w-4 h-4 mr-2" />
                      {isUploading ? 'Processing...' : `Select ${currentStepData?.title} File${currentStepData?.fileType === 'leads' ? 's' : ''}`}
                    </label>
                  </Button>
                </div>
              ) : (
                <div className="text-center text-green-600">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                  <p className="font-medium">Step Completed Successfully</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Real-time Status Panel */}
          {(uploadStatus || processingDetails.stage !== 'idle') && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span>Upload Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {uploadStatus && (
                  <p className="text-sm font-medium">{uploadStatus}</p>
                )}
                {processingDetails.stage !== 'idle' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="capitalize">{processingDetails.stage}</span>
                      <span>{processingDetails.progress}%</span>
                    </div>
                    <Progress value={processingDetails.progress} className="h-2" />
                    <p className="text-xs text-muted-foreground">{processingDetails.details}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Manual Recovery Options */}
          {canManuallyAdvance && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-amber-600" />
                  <span>Manual Recovery Available</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-amber-800">
                  Upload attempts have failed. You can manually advance to the next step and retry this upload later.
                </p>
                <div className="flex space-x-2">
                  <Button 
                    onClick={forceAdvanceStep}
                    variant="outline"
                    size="sm"
                    className="border-amber-300 text-amber-700 hover:bg-amber-100"
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    Force Advance
                  </Button>
                  <Button 
                    onClick={() => {
                      setCanManuallyAdvance(false);
                      setUploadAttempts(prev => ({ ...prev, [currentStep]: 0 }));
                    }}
                    variant="ghost"
                    size="sm"
                  >
                    Retry Upload
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Debug Panel Toggle */}
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDebugPanel(!showDebugPanel)}
              className="text-muted-foreground"
            >
              {showDebugPanel ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
              {showDebugPanel ? 'Hide' : 'Show'} Debug Info
            </Button>
          </div>

          {/* Debug Panel */}
          {showDebugPanel && (
            <Card className="border-slate-200 bg-slate-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Bug className="w-4 h-4" />
                  <span>Debug Information</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDebugLogs([])}
                    className="ml-auto h-6 px-2 text-xs"
                  >
                    Clear
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="font-medium">Current Step:</span> {currentStep}/{uploadSteps.length}
                    </div>
                    <div>
                      <span className="font-medium">Attempts:</span> {uploadAttempts[currentStep] || 0}
                    </div>
                    <div>
                      <span className="font-medium">Processing:</span> {isUploading ? 'Yes' : 'No'}
                    </div>
                    <div>
                      <span className="font-medium">Manual Mode:</span> {canManuallyAdvance ? 'Available' : 'Disabled'}
                    </div>
                  </div>
                  <div className="border-t pt-2">
                    <p className="text-xs font-medium mb-1">Recent Logs:</p>
                    <div className="max-h-32 overflow-y-auto space-y-1 text-xs font-mono bg-slate-100 p-2 rounded">
                      {debugLogs.length === 0 ? (
                        <p className="text-muted-foreground">No debug logs yet...</p>
                      ) : (
                        debugLogs.slice(-10).map((log, index) => (
                          <div key={index} className="break-all">{log}</div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step Navigation */}
          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={handlePrevious}
                disabled={currentStep === 1 || isUploading || isNavigating}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              
              <AlertDialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline"
                    disabled={isUploading || isNavigating}
                    className="text-destructive hover:text-destructive"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Restart
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center space-x-2">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      <span>Restart Upload Process?</span>
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will clear all progress and uploaded data, returning you to the first step. 
                      You'll need to re-upload all files. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRestart} className="bg-destructive hover:bg-destructive/90">
                      Restart Process
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            
            <div className="flex space-x-2">
              {currentStep < uploadSteps.length && (
                <Button 
                  onClick={handleNext}
                  disabled={!isCurrentStepCompleted || isNavigating}
                >
                  Next Step
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>

          {/* Show results for completed steps */}
          {completedSteps.size > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Completed Steps:</h4>
              <div className="space-y-2">
                {uploadSteps
                  .filter(step => completedSteps.has(step.id))
                  .map(step => (
                    <div key={step.id}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>{step.title}</span>
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => toggleResultExpansion(step.id)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View Results
                        </Button>
                      </div>
                      {renderStepResult(step, stepResults[step.id])}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Progress Overview */}
          <div className="grid grid-cols-4 gap-2">
            {uploadSteps.map((step) => (
              <div 
                key={step.id}
                className={`p-2 rounded text-center text-xs ${
                  completedSteps.has(step.id) 
                    ? 'bg-green-100 text-green-800 border border-green-300' 
                    : step.id === currentStep
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {completedSteps.has(step.id) && <CheckCircle className="w-3 h-3 mx-auto mb-1" />}
                <div className="font-medium">{step.title.split(' ')[1]}</div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SequentialDataUploadModal;