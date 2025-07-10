import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Upload, ArrowRight, RotateCcw, AlertTriangle, ArrowLeft } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useInventoryUpload } from '@/hooks/useInventoryUpload';
import { useEnhancedFinancialUpload } from '@/hooks/useEnhancedFinancialUpload';
import { useMultiFileLeadUpload } from '@/hooks/useMultiFileLeadUpload';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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

  // Upload hooks with enhanced functionality
  const inventoryUpload = useInventoryUpload({ userId });
  const financialUpload = useEnhancedFinancialUpload(userId);
  const leadUpload = useMultiFileLeadUpload();

  const { addFiles: addFinancialFiles, processBatch: processFinancialBatch, batchResult: financialResult, uploading: financialUploading, resetState: resetFinancialState } = financialUpload;
  const { addFiles: addLeadFiles, processBatch: processLeadBatch, batchResult: leadResult, resetState: resetLeadState } = leadUpload;

  const currentStepData = uploadSteps.find(step => step.id === currentStep);
  const progress = (completedSteps.size / uploadSteps.length) * 100;
  const isComplete = completedSteps.size === uploadSteps.length;

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const step = currentStepData!;
    
    try {
      if (step.fileType === 'inventory' && step.condition) {
        // Call the inventory upload handler - completion will be handled by useEffect
        inventoryUpload.handleFileUpload(event, step.condition);
      } else if (step.fileType === 'financial') {
        // Convert FileList to array for financial upload
        const fileArray = Array.from(files);
        const queuedFiles = fileArray.map((file, index) => ({
          id: `${Date.now()}-${index}`,
          file,
          status: 'pending' as const
        }));
        addFinancialFiles(queuedFiles);
        await processFinancialBatch();
        // Financial upload completion will be handled by useEffect watching financialResult
      } else if (step.fileType === 'leads') {
        // Lead upload uses FileList directly
        addLeadFiles(files);
        const result = await processLeadBatch();
        if (result) {
          handleStepComplete(result);
        }
      }
    } catch (error) {
      console.error(`Error uploading ${step.title}:`, error);
    }

    // Reset input
    event.target.value = '';
  };

  const handleStepComplete = (result: any) => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    setStepResults(prev => ({ ...prev, [currentStep]: result }));
    
    if (currentStep < uploadSteps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Watch for inventory upload completion
  useEffect(() => {
    if (currentStepData?.fileType === 'inventory' && inventoryUpload.uploadResult && !inventoryUpload.uploading) {
      if (inventoryUpload.uploadResult.status === 'success' || inventoryUpload.uploadResult.status === 'partial') {
        handleStepComplete(inventoryUpload.uploadResult);
      }
    }
  }, [inventoryUpload.uploadResult, inventoryUpload.uploading, currentStepData?.fileType]);

  // Watch for financial upload completion
  useEffect(() => {
    if (currentStepData?.fileType === 'financial' && financialResult && !financialUploading) {
      handleStepComplete(financialResult);
    }
  }, [financialResult, financialUploading, currentStepData?.fileType]);

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
            inventoryUpload.resetState();
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
    inventoryUpload.resetState();
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
  const isUploading = inventoryUpload.uploading || financialUploading || leadUpload.processing;

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
            <div className="grid grid-cols-2 gap-4">
              {uploadSteps.map((step) => {
                const result = stepResults[step.id];
                return (
                  <Card key={step.id} className="border-green-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>{step.title}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground">
                        {result?.success || result?.successfulLeads || 'Completed'} items processed
                      </p>
                    </CardContent>
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