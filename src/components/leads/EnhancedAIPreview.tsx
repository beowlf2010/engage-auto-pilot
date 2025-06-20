
import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Bot } from 'lucide-react';
import { useAIMessagePreview } from '@/hooks/useAIMessagePreview';
import DataQualityCard from './preview/DataQualityCard';
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
    isGenerating,
    generatedMessage,
    showPreview,
    isSending,
    debugInfo,
    overrides,
    generatePreview,
    sendNow,
    cancel,
    handleNameOverride,
    handleVehicleOverride,
    regenerateWithOverrides
  } = useAIMessagePreview({ 
    leadId, 
    onMessageSent: () => {
      onAIEnabled();
      onClose();
    }
  });

  // Auto-generate message when modal opens if autoGenerate is true
  useEffect(() => {
    if (isOpen && autoGenerate && !isGenerating && !generatedMessage) {
      generatePreview();
    }
  }, [isOpen, autoGenerate, isGenerating, generatedMessage, generatePreview]);

  const handleSendMessage = async () => {
    await sendNow();
  };

  const handleCancel = () => {
    cancel();
    onClose();
  };

  // Use finalDataQuality if overrides are applied, otherwise use original
  const displayDataQuality = debugInfo?.finalDataQuality || debugInfo?.dataQuality;

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
          {isGenerating && <LoadingState />}

          {!isGenerating && generatedMessage && (
            <>
              {/* Enhanced Data Quality Information with Override Controls */}
              {displayDataQuality && (
                <DataQualityCard
                  displayDataQuality={displayDataQuality}
                  debugInfo={debugInfo}
                  overrides={overrides}
                  isGenerating={isGenerating}
                  onNameOverride={handleNameOverride}
                  onVehicleOverride={handleVehicleOverride}
                  onRegenerateWithOverrides={regenerateWithOverrides}
                />
              )}

              {/* Message preview */}
              <MessagePreviewCard generatedMessage={generatedMessage} />

              {/* Scheduling info */}
              <SchedulingInfoCard />

              {/* Action buttons */}
              <AIPreviewActions
                generatedMessage={generatedMessage}
                isGenerating={isGenerating}
                isSending={isSending}
                onSend={handleSendMessage}
                onCancel={handleCancel}
              />
            </>
          )}

          {!isGenerating && !generatedMessage && (
            <>
              {/* Introduction */}
              <div className="text-sm text-gray-600">
                Finn AI will analyze data quality and send a personalized initial message to {leadName} 
                {vehicleInterest && ` about their interest in ${vehicleInterest}`}.
              </div>

              {/* Action buttons */}
              <AIPreviewActions
                generatedMessage={generatedMessage}
                isGenerating={isGenerating}
                isSending={isSending}
                onCancel={handleCancel}
                onGenerate={generatePreview}
              />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedAIPreview;
