
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Bot } from "lucide-react";
import { triggerAITakeover } from "@/services/aiTakeoverService";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAIMessagePreview } from "@/hooks/useAIMessagePreview";
import AIStatusBadge from "./compact-ai/AIStatusBadge";
import AIControlsSection from "./compact-ai/AIControlsSection";
import PendingResponseAlert from "./compact-ai/PendingResponseAlert";
import AIActionButtons from "./compact-ai/AIActionButtons";
import AIMessagePreviewPanel from "./compact-ai/AIMessagePreviewPanel";

interface CompactAIControlsProps {
  leadId: string;
  aiOptIn: boolean;
  messageIntensity?: string;
  aiSequencePaused: boolean;
  aiTakeoverEnabled: boolean;
  aiTakeoverDelayMinutes: number;
  pendingHumanResponse: boolean;
  nextAiSendAt?: string;
  onAIOptInChange: (enabled: boolean) => Promise<void>;
  onAITakeoverChange: (enabled: boolean, delayMinutes: number) => Promise<void>;
  // Lead info for preview
  leadName?: string;
  vehicleInterest?: string;
  onMessageSent?: () => void;
}

const CompactAIControls: React.FC<CompactAIControlsProps> = ({
  leadId,
  aiOptIn,
  messageIntensity,
  aiSequencePaused,
  aiTakeoverEnabled,
  aiTakeoverDelayMinutes,
  pendingHumanResponse,
  nextAiSendAt,
  onAIOptInChange,
  onAITakeoverChange,
  leadName,
  vehicleInterest,
  onMessageSent
}) => {
  const { user } = useAuth();
  const [isToggling, setIsToggling] = useState(false);
  const [isTakingOver, setIsTakingOver] = useState(false);

  const {
    isGenerating,
    generatedMessage,
    showPreview,
    isSending,
    generatePreview,
    sendNow,
    cancel
  } = useAIMessagePreview({ 
    leadId, 
    onMessageSent 
  });

  const handleOptInToggle = async () => {
    if (isToggling) return;
    setIsToggling(true);
    try {
      await onAIOptInChange(!aiOptIn);
    } finally {
      setIsToggling(false);
    }
  };

  const handleTakeoverToggle = async () => {
    await onAITakeoverChange(!aiTakeoverEnabled, aiTakeoverDelayMinutes);
  };

  const handleTriggerTakeover = async () => {
    if (isTakingOver) return;
    setIsTakingOver(true);
    try {
      await triggerAITakeover(leadId);
    } finally {
      setIsTakingOver(false);
    }
  };

  const handlePreviewMessage = () => {
    generatePreview();
  };

  const handleSendNow = () => {
    sendNow();
  };

  const handleCancel = () => {
    cancel();
  };

  return (
    <Card className="p-4 w-full">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold">Finn AI</h3>
          </div>
          <AIStatusBadge
            aiOptIn={aiOptIn}
            pendingHumanResponse={pendingHumanResponse}
            aiSequencePaused={aiSequencePaused}
            messageIntensity={messageIntensity}
          />
        </div>

        <AIControlsSection
          aiOptIn={aiOptIn}
          aiTakeoverEnabled={aiTakeoverEnabled}
          aiTakeoverDelayMinutes={aiTakeoverDelayMinutes}
          isToggling={isToggling}
          onOptInToggle={handleOptInToggle}
          onTakeoverToggle={handleTakeoverToggle}
        />

        <PendingResponseAlert
          pendingHumanResponse={pendingHumanResponse}
          aiTakeoverEnabled={aiTakeoverEnabled}
          isTakingOver={isTakingOver}
          onTriggerTakeover={handleTriggerTakeover}
        />

        {/* AI Message Preview Panel */}
        {showPreview && (
          <AIMessagePreviewPanel
            leadId={leadId}
            leadName={leadName || 'Lead'}
            vehicleInterest={vehicleInterest}
            generatedMessage={generatedMessage}
            isGenerating={isGenerating}
            onSendNow={handleSendNow}
            onCancel={handleCancel}
          />
        )}

        <AIActionButtons
          aiOptIn={aiOptIn}
          pendingHumanResponse={pendingHumanResponse}
          nextAiSendAt={nextAiSendAt}
          isSending={isSending || isGenerating}
          onPreviewMessage={handlePreviewMessage}
        />
      </div>
    </Card>
  );
};

export default CompactAIControls;
