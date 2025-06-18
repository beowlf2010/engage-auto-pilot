
import React from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Clock, Eye } from "lucide-react";

interface AIActionButtonsProps {
  aiOptIn: boolean;
  pendingHumanResponse: boolean;
  nextAiSendAt?: string;
  isSending: boolean;
  onPreviewMessage: () => void;
}

const AIActionButtons: React.FC<AIActionButtonsProps> = ({
  aiOptIn,
  pendingHumanResponse,
  nextAiSendAt,
  isSending,
  onPreviewMessage
}) => {
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

  if (!aiOptIn || pendingHumanResponse) return null;

  return (
    <>
      {/* Next Send Time */}
      {formatNextSendTime() && (
        <div className="text-xs text-gray-600 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatNextSendTime()}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onPreviewMessage}
          disabled={isSending}
          className="flex-1"
        >
          <Eye className="w-3 h-3 mr-1" />
          {isSending ? "Sending..." : "Preview & Send"}
        </Button>
      </div>
    </>
  );
};

export default AIActionButtons;
