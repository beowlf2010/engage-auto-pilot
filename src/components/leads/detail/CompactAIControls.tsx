import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  Clock, 
  MessageSquare, 
  AlertCircle, 
  CheckCircle2,
  UserX,
  Zap
} from "lucide-react";
import { triggerImmediateMessage } from "@/services/proactiveAIService";
import { triggerAITakeover } from "@/services/aiTakeoverService";
import { useAuth } from "@/components/auth/AuthProvider";

interface CompactAIControlsProps {
  leadId: string;
  aiOptIn: boolean;
  aiStage?: string;
  aiSequencePaused: boolean;
  aiTakeoverEnabled: boolean;
  aiTakeoverDelayMinutes: number;
  pendingHumanResponse: boolean;
  nextAiSendAt?: string;
  onAIOptInChange: (enabled: boolean) => Promise<void>;
  onAITakeoverChange: (enabled: boolean, delayMinutes: number) => Promise<void>;
}

const CompactAIControls: React.FC<CompactAIControlsProps> = ({
  leadId,
  aiOptIn,
  aiStage,
  aiSequencePaused,
  aiTakeoverEnabled,
  aiTakeoverDelayMinutes,
  pendingHumanResponse,
  nextAiSendAt,
  onAIOptInChange,
  onAITakeoverChange
}) => {
  const { user } = useAuth();
  const [isToggling, setIsToggling] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTakingOver, setIsTakingOver] = useState(false);

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

  const handleSendMessage = async () => {
    if (!user || isSending) return;
    setIsSending(true);
    try {
      await triggerImmediateMessage(leadId, user);
    } finally {
      setIsSending(false);
    }
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

  const getStatusBadge = () => {
    if (!aiOptIn) {
      return <Badge variant="secondary" className="flex items-center gap-1">
        <UserX className="w-3 h-3" />
        Disabled
      </Badge>;
    }

    if (pendingHumanResponse) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        Waiting for Human
      </Badge>;
    }

    if (aiSequencePaused) {
      return <Badge variant="outline" className="flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Paused
      </Badge>;
    }

    if (aiStage) {
      return <Badge variant="default" className="flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3" />
        {aiStage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>;
    }

    return <Badge variant="secondary">Ready</Badge>;
  };

  const formatNextSendTime = () => {
    if (!nextAiSendAt) return null;
    try {
      const date = new Date(nextAiSendAt);
      const now = new Date();
      if (date <= now) return "Ready to send";
      return `Next: ${date.toLocaleString()}`;
    } catch {
      return null;
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold">Finn AI</h3>
          </div>
          {getStatusBadge()}
        </div>

        {/* AI Opt-in Control */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">AI Messaging</span>
          <Switch
            checked={aiOptIn}
            onCheckedChange={handleOptInToggle}
            disabled={isToggling}
          />
        </div>

        {/* AI Takeover Control */}
        {aiOptIn && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">AI Takeover</span>
              <Switch
                checked={aiTakeoverEnabled}
                onCheckedChange={handleTakeoverToggle}
              />
            </div>
            {aiTakeoverEnabled && (
              <p className="text-xs text-gray-600">
                AI will take over after {aiTakeoverDelayMinutes} minutes of no human response
              </p>
            )}
          </div>
        )}

        {/* Pending Human Response Alert */}
        {pendingHumanResponse && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Waiting for Human Response
                </p>
                <p className="text-xs text-yellow-700">
                  Customer replied and is waiting for a human response.
                </p>
                {aiTakeoverEnabled && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleTriggerTakeover}
                    disabled={isTakingOver}
                    className="mt-2 text-xs"
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    {isTakingOver ? "Taking over..." : "Trigger AI Takeover"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Next Send Time */}
        {aiOptIn && !pendingHumanResponse && formatNextSendTime() && (
          <div className="text-xs text-gray-600 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatNextSendTime()}
          </div>
        )}

        {/* Action Buttons */}
        {aiOptIn && !pendingHumanResponse && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSendMessage}
              disabled={isSending}
              className="flex-1"
            >
              <MessageSquare className="w-3 h-3 mr-1" />
              {isSending ? "Sending..." : "Send Now"}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default CompactAIControls;
