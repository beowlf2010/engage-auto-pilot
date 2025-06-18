
import React from "react";
import { Switch } from "@/components/ui/switch";

interface AIControlsSectionProps {
  aiOptIn: boolean;
  aiTakeoverEnabled: boolean;
  aiTakeoverDelayMinutes: number;
  isToggling: boolean;
  onOptInToggle: () => void;
  onTakeoverToggle: () => void;
}

const AIControlsSection: React.FC<AIControlsSectionProps> = ({
  aiOptIn,
  aiTakeoverEnabled,
  aiTakeoverDelayMinutes,
  isToggling,
  onOptInToggle,
  onTakeoverToggle
}) => {
  return (
    <>
      {/* AI Opt-in Control */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">AI Messaging</span>
        <Switch
          checked={aiOptIn}
          onCheckedChange={onOptInToggle}
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
              onCheckedChange={onTakeoverToggle}
            />
          </div>
          {aiTakeoverEnabled && (
            <p className="text-xs text-gray-600">
              AI will take over after {aiTakeoverDelayMinutes} minutes of no human response
            </p>
          )}
        </div>
      )}
    </>
  );
};

export default AIControlsSection;
