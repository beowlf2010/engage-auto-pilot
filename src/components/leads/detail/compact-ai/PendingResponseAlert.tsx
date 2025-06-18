
import React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Zap } from "lucide-react";

interface PendingResponseAlertProps {
  pendingHumanResponse: boolean;
  aiTakeoverEnabled: boolean;
  isTakingOver: boolean;
  onTriggerTakeover: () => void;
}

const PendingResponseAlert: React.FC<PendingResponseAlertProps> = ({
  pendingHumanResponse,
  aiTakeoverEnabled,
  isTakingOver,
  onTriggerTakeover
}) => {
  if (!pendingHumanResponse) return null;

  return (
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
              onClick={onTriggerTakeover}
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
  );
};

export default PendingResponseAlert;
