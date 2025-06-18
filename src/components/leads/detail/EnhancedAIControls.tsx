
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  Bot, 
  Play, 
  Pause, 
  RotateCcw, 
  Calendar, 
  MessageSquare, 
  TrendingUp,
  Settings,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  Timer
} from "lucide-react";
import { format, addDays } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface AIControlsProps {
  leadId: string;
  aiOptIn: boolean;
  aiStage?: string;
  aiMessagesSent?: number;
  aiSequencePaused?: boolean;
  aiPauseReason?: string;
  aiResumeAt?: string;
  nextAiSendAt?: string;
  aiTakeoverEnabled?: boolean;
  aiTakeoverDelayMinutes?: number;
  pendingHumanResponse?: boolean;
  humanResponseDeadline?: string;
  onAIOptInChange: (enabled: boolean) => Promise<void>;
  onAIStageChange?: (stage: string) => Promise<void>;
  onPauseAI?: (reason: string, resumeAt?: string) => Promise<void>;
  onResumeAI?: () => Promise<void>;
  onResetAI?: () => Promise<void>;
  onAITakeoverChange?: (enabled: boolean, delayMinutes: number) => Promise<void>;
}

const AI_STAGES = [
  { value: 'welcome', label: 'Welcome Sequence', description: 'Initial introduction and interest validation' },
  { value: 'nurture', label: 'Nurture Sequence', description: 'Build relationship and provide value' },
  { value: 'inventory', label: 'Inventory Matching', description: 'Show relevant vehicles' },
  { value: 'closing', label: 'Closing Sequence', description: 'Drive appointment and close' },
  { value: 'followup', label: 'Follow-up', description: 'Post-interaction follow-up' }
];

const TAKEOVER_DELAY_OPTIONS = [
  { value: 5, label: '5 minutes' },
  { value: 7, label: '7 minutes' },
  { value: 10, label: '10 minutes' }
];

const getStageProgress = (stage?: string, messagesSent: number = 0) => {
  const stageIndex = AI_STAGES.findIndex(s => s.value === stage);
  if (stageIndex === -1) return 0;
  
  const baseProgress = (stageIndex / AI_STAGES.length) * 100;
  const messageProgress = Math.min(messagesSent * 5, 20); // 5% per message, max 20%
  
  return Math.min(baseProgress + messageProgress, 100);
};

const getStatusColor = (aiOptIn: boolean, aiSequencePaused?: boolean, pendingHumanResponse?: boolean) => {
  if (!aiOptIn) return 'bg-gray-100 text-gray-800';
  if (pendingHumanResponse) return 'bg-blue-100 text-blue-800';
  if (aiSequencePaused) return 'bg-yellow-100 text-yellow-800';
  return 'bg-green-100 text-green-800';
};

const getStatusIcon = (aiOptIn: boolean, aiSequencePaused?: boolean, pendingHumanResponse?: boolean) => {
  if (!aiOptIn) return <Bot className="w-3 h-3 text-gray-500" />;
  if (pendingHumanResponse) return <Users className="w-3 h-3 text-blue-500" />;
  if (aiSequencePaused) return <Pause className="w-3 h-3 text-yellow-500" />;
  return <Play className="w-3 h-3 text-green-500" />;
};

const getStatusText = (aiOptIn: boolean, aiSequencePaused?: boolean, pendingHumanResponse?: boolean) => {
  if (!aiOptIn) return 'Disabled';
  if (pendingHumanResponse) return 'Waiting for Human';
  if (aiSequencePaused) return 'Paused';
  return 'Active';
};

const EnhancedAIControls: React.FC<AIControlsProps> = ({
  leadId,
  aiOptIn,
  aiStage,
  aiMessagesSent = 0,
  aiSequencePaused,
  aiPauseReason,
  aiResumeAt,
  nextAiSendAt,
  aiTakeoverEnabled = false,
  aiTakeoverDelayMinutes = 7,
  pendingHumanResponse = false,
  humanResponseDeadline,
  onAIOptInChange,
  onAIStageChange,
  onPauseAI,
  onResumeAI,
  onResetAI,
  onAITakeoverChange
}) => {
  const [pauseReason, setPauseReason] = useState('');
  const [resumeDate, setResumeDate] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [takeoverDelay, setTakeoverDelay] = useState(aiTakeoverDelayMinutes);

  const currentStage = AI_STAGES.find(stage => stage.value === aiStage);
  const progress = getStageProgress(aiStage, aiMessagesSent);

  const handlePauseAI = async () => {
    if (!pauseReason.trim()) {
      toast({
        title: "Pause reason required",
        description: "Please provide a reason for pausing the AI sequence",
        variant: "destructive",
      });
      return;
    }

    try {
      await onPauseAI?.(pauseReason, resumeDate || undefined);
      setPauseReason('');
      setResumeDate('');
      toast({
        title: "AI sequence paused",
        description: "The AI sequence has been paused successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to pause AI sequence",
        variant: "destructive",
      });
    }
  };

  const handleResumeAI = async () => {
    try {
      await onResumeAI?.();
      toast({
        title: "AI sequence resumed",
        description: "The AI sequence has been resumed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resume AI sequence",
        variant: "destructive",
      });
    }
  };

  const handleResetAI = async () => {
    try {
      await onResetAI?.();
      toast({
        title: "AI sequence reset",
        description: "The AI sequence has been reset to the beginning",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset AI sequence",
        variant: "destructive",
      });
    }
  };

  const handleTakeoverToggle = async (enabled: boolean) => {
    try {
      await onAITakeoverChange?.(enabled, takeoverDelay);
      toast({
        title: enabled ? "AI Takeover enabled" : "AI Takeover disabled",
        description: enabled 
          ? `AI will take over conversations after ${takeoverDelay} minutes of no human response`
          : "AI will wait for manual intervention when leads reply",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update AI takeover setting",
        variant: "destructive",
      });
    }
  };

  const handleDelayChange = async (newDelay: number) => {
    setTakeoverDelay(newDelay);
    if (aiTakeoverEnabled) {
      try {
        await onAITakeoverChange?.(true, newDelay);
        toast({
          title: "Delay updated",
          description: `AI will now take over after ${newDelay} minutes`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update delay",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <Bot className="w-4 h-4" />
            <span>Finn AI Automation</span>
          </span>
          <Badge className={getStatusColor(aiOptIn, aiSequencePaused, pendingHumanResponse)}>
            <span className="flex items-center space-x-1">
              {getStatusIcon(aiOptIn, aiSequencePaused, pendingHumanResponse)}
              <span>
                {getStatusText(aiOptIn, aiSequencePaused, pendingHumanResponse)}
              </span>
            </span>
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* AI Opt-in Toggle */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <div className="font-medium">AI Messaging</div>
            <div className="text-sm text-muted-foreground">
              Enable automated follow-up sequences
            </div>
          </div>
          <Switch
            checked={aiOptIn}
            onCheckedChange={onAIOptInChange}
          />
        </div>

        {aiOptIn && (
          <>
            {/* AI Takeover Toggle */}
            <div className="p-3 border rounded-lg bg-blue-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Timer className="w-4 h-4 text-blue-600" />
                  <div>
                    <div className="font-medium text-blue-900">AI Takeover</div>
                    <div className="text-sm text-blue-700">
                      AI responds automatically if you don't reply in time
                    </div>
                  </div>
                </div>
                <Switch
                  checked={aiTakeoverEnabled}
                  onCheckedChange={handleTakeoverToggle}
                />
              </div>
              
              {aiTakeoverEnabled && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-blue-900">Takeover Delay</div>
                  <Select value={takeoverDelay.toString()} onValueChange={(value) => handleDelayChange(parseInt(value))}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TAKEOVER_DELAY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Pending Human Response Status */}
            {pendingHumanResponse && humanResponseDeadline && (
              <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Users className="w-4 h-4 text-blue-600" />
                <div className="text-sm">
                  <span className="font-medium text-blue-900">Waiting for your response</span>
                  <div className="text-blue-700">
                    AI takes over: {format(new Date(humanResponseDeadline), 'h:mm a')}
                  </div>
                </div>
              </div>
            )}

            {/* Current Stage & Progress */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current Stage</span>
                {onAIStageChange && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    <Settings className="w-3 h-3" />
                  </Button>
                )}
              </div>
              
              {currentStage && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-blue-900">{currentStage.label}</span>
                    <Badge variant="outline">{aiMessagesSent} sent</Badge>
                  </div>
                  <p className="text-sm text-blue-700 mb-3">{currentStage.description}</p>
                  <Progress value={progress} className="h-2" />
                  <div className="text-xs text-blue-600 mt-1">{Math.round(progress)}% complete</div>
                </div>
              )}
            </div>

            {/* Next Message Schedule */}
            {nextAiSendAt && !aiSequencePaused && !pendingHumanResponse && (
              <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                <Calendar className="w-4 h-4 text-green-600" />
                <div className="text-sm">
                  <span className="font-medium text-green-900">Next message: </span>
                  <span className="text-green-700">
                    {format(new Date(nextAiSendAt), 'MMM d, h:mm a')}
                  </span>
                </div>
              </div>
            )}

            {/* Pause Information */}
            {aiSequencePaused && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Pause className="w-4 h-4 text-yellow-600" />
                  <span className="font-medium text-yellow-900">Sequence Paused</span>
                </div>
                {aiPauseReason && (
                  <p className="text-sm text-yellow-700 mb-2">Reason: {aiPauseReason}</p>
                )}
                {aiResumeAt && (
                  <p className="text-sm text-yellow-700">
                    Resumes: {format(new Date(aiResumeAt), 'MMM d, h:mm a')}
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-2">
              {aiSequencePaused ? (
                <Button
                  size="sm"
                  onClick={handleResumeAI}
                  className="flex-1"
                >
                  <Play className="w-3 h-3 mr-1" />
                  Resume
                </Button>
              ) : (
                <div className="flex space-x-2 flex-1">
                  <Textarea
                    placeholder="Reason for pausing..."
                    value={pauseReason}
                    onChange={(e) => setPauseReason(e.target.value)}
                    className="flex-1 min-h-[60px]"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePauseAI}
                    disabled={!pauseReason.trim()}
                  >
                    <Pause className="w-3 h-3 mr-1" />
                    Pause
                  </Button>
                </div>
              )}
              
              {onResetAI && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResetAI}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset
                </Button>
              )}
            </div>

            {/* Advanced Controls */}
            {showAdvanced && onAIStageChange && (
              <div className="p-3 border rounded-lg bg-gray-50">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Override Stage</label>
                    <Select value={aiStage} onValueChange={onAIStageChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {AI_STAGES.map((stage) => (
                          <SelectItem key={stage.value} value={stage.value}>
                            {stage.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Resume Date (Optional)</label>
                    <input
                      type="datetime-local"
                      value={resumeDate}
                      onChange={(e) => setResumeDate(e.target.value)}
                      className="w-full p-2 border rounded text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* AI Statistics */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2 bg-gray-50 rounded">
                <div className="text-lg font-bold text-gray-900">{aiMessagesSent}</div>
                <div className="text-xs text-gray-600">Messages Sent</div>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <div className="text-lg font-bold text-gray-900">{Math.round(progress)}%</div>
                <div className="text-xs text-gray-600">Progress</div>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <div className="text-lg font-bold text-gray-900">
                  {currentStage ? AI_STAGES.findIndex(s => s.value === aiStage) + 1 : 0}/
                  {AI_STAGES.length}
                </div>
                <div className="text-xs text-gray-600">Stage</div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedAIControls;
