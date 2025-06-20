
import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Bot, Brain } from 'lucide-react';
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

  const handleCancel = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-600" />
            Enable AI for {leadName}
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
                onSend={sendNow}
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedAIPreview;
