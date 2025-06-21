
import React, { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Bot, Brain, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAIMessagePreview } from '@/hooks/useAIMessagePreview';
import ValidationDecisionCard from './preview/ValidationDecisionCard';
import MessagePreviewCard from './preview/MessagePreviewCard';
import SchedulingInfoCard from './preview/SchedulingInfoCard';
import AIPreviewActions from './preview/AIPreviewActions';
import LoadingState from './preview/LoadingState';

interface EnhancedAIPreviewProps {
  leadId: string;
  leadName: string;
  vehicleInterest?: string;
  isOpen: boolean;
  onClose: () => void;
  onAIEnabled: () => void;
  autoGenerate?: boolean;
}

const EnhancedAIPreview: React.FC<EnhancedAIPreviewProps> = ({
  leadId,
  leadName,
  vehicleInterest,
  isOpen,
  onClose,
  onAIEnabled,
  autoGenerate = false
}) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const {
    isAnalyzing,
    isGenerating,
    generatedMessage,
    showDecisionStep,
    showPreview,
    isSending,
    originalDataQuality,
    leadData,
    nameDecision,
    vehicleDecision,
    startAnalysis,
    handleNameDecision,
    handleVehicleDecision,
    generateWithDecisions,
    sendNow,
    reset
  } = useAIMessagePreview({ 
    leadId, 
    onMessageSent: () => {
      onAIEnabled();
      onClose();
    }
  });

  // Auto-start analysis when modal opens if autoGenerate is true
  useEffect(() => {
    if (isOpen && autoGenerate && !isAnalyzing && !showDecisionStep && !showPreview) {
      startAnalysis();
    }
  }, [isOpen, autoGenerate, isAnalyzing, showDecisionStep, showPreview, startAnalysis]);

  // Add timeout protection - auto close modal after 30 seconds if stuck
  useEffect(() => {
    if (isOpen && (isAnalyzing || isGenerating)) {
      timeoutRef.current = setTimeout(() => {
        console.log('🚨 Modal timeout - force closing after 30 seconds');
        handleCancel();
      }, 30000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isOpen, isAnalyzing, isGenerating]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleCancel = () => {
    // Clear any timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Reset state and close
    reset();
    onClose();
  };

  const handleSend = () => {
    sendNow();
  };

  // Force close functionality
  const handleForceClose = (open: boolean) => {
    if (!open) {
      handleCancel();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleForceClose}>
      <DialogContent className="max-w-lg" onPointerDownOutside={handleCancel}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-600" />
              Enable AI for {leadName}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleCancel}
              className="h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Analyzing State */}
          {isAnalyzing && (
            <div className="text-center py-8">
              <Brain className="w-8 h-8 text-blue-600 mx-auto mb-4 animate-pulse" />
              <h3 className="font-medium mb-2">Analyzing Lead Data</h3>
              <p className="text-sm text-gray-600">
                AI is reviewing name and vehicle information for quality...
              </p>
              <div className="mt-4">
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Decision Step */}
          {showDecisionStep && originalDataQuality && leadData && (
            <ValidationDecisionCard
              firstName={leadData.first_name}
              vehicleInterest={leadData.vehicle_interest}
              nameValidation={originalDataQuality.nameValidation}
              vehicleValidation={originalDataQuality.vehicleValidation}
              nameDecision={nameDecision}
              vehicleDecision={vehicleDecision}
              onNameDecision={handleNameDecision}
              onVehicleDecision={handleVehicleDecision}
              onGenerate={generateWithDecisions}
              isGenerating={isGenerating}
            />
          )}

          {/* Message Preview Step */}
          {showPreview && generatedMessage && (
            <>
              <MessagePreviewCard generatedMessage={generatedMessage} />
              <SchedulingInfoCard />
              <AIPreviewActions
                generatedMessage={generatedMessage}
                isGenerating={false}
                isSending={isSending}
                onSend={handleSend}
                onCancel={handleCancel}
              />
            </>
          )}

          {/* Initial State */}
          {!isAnalyzing && !showDecisionStep && !showPreview && (
            <>
              <div className="text-sm text-gray-600">
                Finn AI will analyze data quality and let you approve the name and vehicle information before generating a personalized message for {leadName}.
              </div>

              <AIPreviewActions
                generatedMessage={null}
                isGenerating={false}
                isSending={false}
                onCancel={handleCancel}
                onGenerate={startAnalysis}
              />
            </>
          )}

          {/* Force close option if stuck */}
          {(isAnalyzing || isGenerating) && (
            <div className="text-center pt-4 border-t">
              <p className="text-xs text-gray-500 mb-2">
                Taking longer than expected?
              </p>
              <Button variant="outline" size="sm" onClick={handleCancel}>
                Force Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedAIPreview;
