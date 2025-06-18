
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Bot, ChevronDown, Play, Pause, Timer } from "lucide-react";

interface CompactAIControlsProps {
  leadId: string;
  aiOptIn: boolean;
  aiStage?: string;
  aiSequencePaused?: boolean;
  aiTakeoverEnabled?: boolean;
  aiTakeoverDelayMinutes?: number;
  pendingHumanResponse?: boolean;
  onAIOptInChange: (enabled: boolean) => Promise<void>;
  onAITakeoverChange?: (enabled: boolean, delayMinutes: number) => Promise<void>;
}

const CompactAIControls: React.FC<CompactAIControlsProps> = ({
  leadId,
  aiOptIn,
  aiStage,
  aiSequencePaused,
  aiTakeoverEnabled = false,
  aiTakeoverDelayMinutes = 7,
  pendingHumanResponse = false,
  onAIOptInChange,
  onAITakeoverChange
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusBadge = () => {
    if (!aiOptIn) return <Badge variant="secondary">Disabled</Badge>;
    if (pendingHumanResponse) return <Badge className="bg-blue-100 text-blue-700">Waiting</Badge>;
    if (aiSequencePaused) return <Badge variant="outline">Paused</Badge>;
    return <Badge className="bg-green-100 text-green-700">Active</Badge>;
  };

  const handleTakeoverToggle = async (enabled: boolean) => {
    if (onAITakeoverChange) {
      await onAITakeoverChange(enabled, aiTakeoverDelayMinutes);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-base">
            <Bot className="w-4 h-4" />
            <span>AI Assistant</span>
          </CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main AI Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-sm">AI Messaging</div>
            <div className="text-xs text-gray-500">Automated follow-up sequences</div>
          </div>
          <Switch checked={aiOptIn} onCheckedChange={onAIOptInChange} />
        </div>

        {aiOptIn && (
          <>
            {/* AI Takeover */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center space-x-2">
                <Timer className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="font-medium text-sm">Auto-takeover</div>
                  <div className="text-xs text-gray-500">
                    {aiTakeoverEnabled ? `After ${aiTakeoverDelayMinutes} min` : 'Manual only'}
                  </div>
                </div>
              </div>
              <Switch 
                checked={aiTakeoverEnabled} 
                onCheckedChange={handleTakeoverToggle} 
              />
            </div>

            {/* Expandable Advanced Controls */}
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between text-xs">
                  Advanced Controls
                  <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-3">
                {aiStage && (
                  <div className="text-xs">
                    <span className="text-gray-500">Current Stage:</span>
                    <span className="ml-2 font-medium capitalize">{aiStage}</span>
                  </div>
                )}
                
                <div className="flex space-x-2">
                  {aiSequencePaused ? (
                    <Button size="sm" variant="outline" className="flex-1">
                      <Play className="w-3 h-3 mr-1" />
                      Resume
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="flex-1">
                      <Pause className="w-3 h-3 mr-1" />
                      Pause
                    </Button>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CompactAIControls;
