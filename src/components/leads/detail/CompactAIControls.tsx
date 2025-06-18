import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bot, Play, Pause, RefreshCw, AlertTriangle, Loader2, Clock, MessageSquare } from "lucide-react";
import { fixLeadAIStage } from '@/services/aiStageFixService';
import { triggerImmediateMessage } from '@/services/proactiveAIService';
import { useAuth } from '@/components/auth/AuthProvider';
import CountdownBadge from '../../inbox/CountdownBadge';

interface CompactAIControlsProps {
  leadId: string;
  aiOptIn: boolean;
  aiStage?: string;
  aiSequencePaused?: boolean;
  aiTakeoverEnabled?: boolean;
  aiTakeoverDelayMinutes?: number;
  pendingHumanResponse?: boolean;
  nextAiSendAt?: string;
  onAIOptInChange: (enabled: boolean) => Promise<void>;
  onAITakeoverChange?: (enabled: boolean, delayMinutes: number) => Promise<void>;
}

const CompactAIControls: React.FC<CompactAIControlsProps> = ({
  leadId,
  aiOptIn,
  aiStage,
  aiSequencePaused,
  aiTakeoverEnabled,
  aiTakeoverDelayMinutes = 7,
  pendingHumanResponse,
  nextAiSendAt,
  onAIOptInChange,
  onAITakeoverChange
}) => {
  const [isToggling, setIsToggling] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const { profile } = useAuth();

  // Debug log for countdown display
  React.useEffect(() => {
    console.log('CompactAIControls nextAiSendAt:', nextAiSendAt);
    console.log('ShowCountdown conditions:', {
      aiOptIn,
      aiSequencePaused,
      pendingHumanResponse,
      nextAiSendAt,
      showCountdown: aiOptIn && !aiSequencePaused && !pendingHumanResponse && nextAiSendAt
    });
  }, [aiOptIn, aiSequencePaused, pendingHumanResponse, nextAiSendAt]);

  const handleFixAIStage = async () => {
    setIsFixing(true);
    try {
      await fixLeadAIStage(leadId);
    } catch (error) {
      console.error('Failed to fix AI stage:', error);
    } finally {
      setIsFixing(false);
    }
  };

  const handleAIOptInToggle = async (enabled: boolean) => {
    setIsToggling(true);
    try {
      await onAIOptInChange(enabled);
    } catch (error) {
      console.error('Failed to toggle AI opt-in:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const handleSendFirstMessage = async () => {
    if (!profile || isSendingMessage) return;
    
    setIsSendingMessage(true);
    try {
      await triggerImmediateMessage(leadId, profile);
      // Refresh the page to show updated status
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Failed to send first message:', error);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const getStatusColor = () => {
    if (!aiOptIn) return 'bg-gray-100 text-gray-800';
    if (pendingHumanResponse) return 'bg-blue-100 text-blue-800';
    if (aiSequencePaused) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusIcon = () => {
    if (isToggling) return <Loader2 className="w-3 h-3 animate-spin text-blue-500" />;
    if (!aiOptIn) return <Bot className="w-3 h-3 text-gray-500" />;
    if (pendingHumanResponse) return <Pause className="w-3 h-3 text-blue-500" />;
    if (aiSequencePaused) return <Pause className="w-3 h-3 text-yellow-500" />;
    return <Play className="w-3 h-3 text-green-500" />;
  };

  const getStatusText = () => {
    if (isToggling) return 'Updating...';
    if (!aiOptIn) return 'Disabled';
    if (pendingHumanResponse) return 'Waiting for Human';
    if (aiSequencePaused) return 'Paused';
    return 'Active';
  };

  // Check if stage looks problematic
  const isProblematicStage = aiOptIn && (aiStage === 'scheduled' || !aiStage);

  // Show countdown when AI is active and has a scheduled send time
  const showCountdown = aiOptIn && !aiSequencePaused && !pendingHumanResponse && nextAiSendAt;

  // Check if this lead needs first contact
  const needsFirstContact = aiOptIn && (!aiStage || aiStage === 'day_1_morning' || aiStage === 'scheduled');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center space-x-2">
            <Bot className="w-4 h-4" />
            <span>Finn AI</span>
          </span>
          <Badge className={getStatusColor()}>
            <span className="flex items-center space-x-1">
              {getStatusIcon()}
              <span>{getStatusText()}</span>
            </span>
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* AI Opt-in Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-sm">AI Messaging</div>
            <div className="text-xs text-muted-foreground">
              Automated follow-ups
            </div>
          </div>
          <Switch
            checked={aiOptIn}
            onCheckedChange={handleAIOptInToggle}
            disabled={isToggling}
          />
        </div>

        {aiOptIn && (
          <>
            {/* Send First Message Button */}
            {needsFirstContact && (
              <div className="p-3 border rounded-lg bg-blue-50 border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium text-sm text-blue-900">Ready to Start</div>
                    <div className="text-xs text-blue-700">
                      Send the first AI message to begin the conversation
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={handleSendFirstMessage}
                  disabled={isSendingMessage}
                  className="w-full text-xs h-8 bg-blue-600 hover:bg-blue-700"
                >
                  {isSendingMessage ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-3 h-3 mr-1" />
                      Send First Message Now
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Next Message Countdown - Enhanced */}
            {showCountdown && (
              <div className="p-3 border rounded-lg bg-green-50 border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-sm text-green-900">Next AI Message</span>
                  </div>
                  <CountdownBadge dt={nextAiSendAt} />
                </div>
                <div className="text-xs text-green-700">
                  Finn will automatically send the next message in the sequence
                </div>
              </div>
            )}

            {/* Debug Info for Missing Countdown */}
            {aiOptIn && !showCountdown && (
              <div className="p-2 border rounded bg-yellow-50 border-yellow-200">
                <div className="text-xs text-yellow-800">
                  AI Debug: No scheduled message
                  <div className="mt-1 space-y-1 font-mono text-xs">
                    <div>Stage: {aiStage || 'None'}</div>
                    <div>Next Send: {nextAiSendAt || 'None'}</div>
                    <div>Paused: {aiSequencePaused ? 'Yes' : 'No'}</div>
                    <div>Human Response: {pendingHumanResponse ? 'Pending' : 'None'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Takeover Toggle */}
            <div className="p-2 border rounded bg-blue-50">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-medium text-xs text-blue-900">AI Takeover</div>
                  <div className="text-xs text-blue-700">
                    Auto-respond after {aiTakeoverDelayMinutes}min
                  </div>
                </div>
                <Switch
                  checked={aiTakeoverEnabled}
                  onCheckedChange={(enabled) => onAITakeoverChange?.(enabled, aiTakeoverDelayMinutes)}
                />
              </div>
            </div>

            {/* Current Stage Info */}
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stage:</span>
                <span className="font-medium">{aiStage || 'Not Set'}</span>
              </div>
            </div>

            {/* Fix Button for Problematic Stages */}
            {isProblematicStage && (
              <div className="p-2 bg-orange-50 border border-orange-200 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-3 h-3 text-orange-600" />
                  <span className="text-xs font-medium text-orange-900">
                    AI sequence needs fixing
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleFixAIStage}
                  disabled={isFixing}
                  className="w-full text-xs h-7"
                >
                  {isFixing ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3 mr-1" />
                  )}
                  Fix AI Sequence
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CompactAIControls;
