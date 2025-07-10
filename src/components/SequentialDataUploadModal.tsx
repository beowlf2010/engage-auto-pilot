import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Upload, ArrowRight, RotateCcw } from 'lucide-react';
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

  // Upload hooks
  const inventoryUpload = useInventoryUpload({ userId });
  const { addFiles: addFinancialFiles, processBatch: processFinancialBatch, batchResult: financialResult } = useEnhancedFinancialUpload(userId);
  const { addFiles: addLeadFiles, processBatch: processLeadBatch, batchResult: leadResult } = useMultiFileLeadUpload();

  const currentStepData = uploadSteps.find(step => step.id === currentStep);
  const progress = (completedSteps.size / uploadSteps.length) * 100;
  const isComplete = completedSteps.size === uploadSteps.length;

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const step = currentStepData!;
    
    try {
      if (step.fileType === 'inventory' && step.condition) {
        await inventoryUpload.handleFileUpload(event, step.condition);
        // Mark step as completed when inventory upload finishes
        if (inventoryUpload.uploadResult?.status === 'success') {
          handleStepComplete(inventoryUpload.uploadResult);
        }
      } else if (step.fileType === 'financial') {
        // Convert FileList to array for financial upload
        const fileArray = Array.from(files);
        const queuedFiles = fileArray.map((file, index) => ({
          id: `${Date.now()}-${index}`,
          file,
          status: 'pending' as const
        }));
        addFinancialFiles(queuedFiles);
        const result = await processFinancialBatch();
        handleStepComplete(result);
      } else if (step.fileType === 'leads') {
        // Lead upload uses FileList directly
        addLeadFiles(files);
        const result = await processLeadBatch();
        handleStepComplete(result);
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

  const handleNext = () => {
    if (currentStep < uploadSteps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleRestart = () => {
    setCurrentStep(1);
    setCompletedSteps(new Set());
    setStepResults({});
  };

  const isCurrentStepCompleted = completedSteps.has(currentStep);
  const canProceed = isCurrentStepCompleted || currentStep === 1;

  // Check if current upload is in progress
  const isUploading = inventoryUpload.uploading || 
                     (currentStepData?.fileType === 'financial' && financialResult === null) ||
                     (currentStepData?.fileType === 'leads' && leadResult === null);

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
              <Button variant="outline" onClick={handleRestart}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Start Over
              </Button>
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
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              Previous
            </Button>
            
            <div className="flex space-x-2">
              {currentStep < uploadSteps.length && (
                <Button 
                  onClick={handleNext}
                  disabled={!isCurrentStepCompleted}
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