
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Clock, X, Send } from "lucide-react";

interface AIMessagePreviewPanelProps {
  leadId: string;
  leadName: string;
  vehicleInterest?: string;
  generatedMessage: string;
  isGenerating: boolean;
  onSendNow: () => void;
  onCancel: () => void;
  countdownSeconds?: number;
}

const AIMessagePreviewPanel: React.FC<AIMessagePreviewPanelProps> = ({
  leadId,
  leadName,
  vehicleInterest,
  generatedMessage,
  isGenerating,
  onSendNow,
  onCancel,
  countdownSeconds = 10
}) => {
  const [timeLeft, setTimeLeft] = useState(countdownSeconds);
  const [isCancelled, setIsCancelled] = useState(false);

  useEffect(() => {
    if (isGenerating || isCancelled) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onSendNow();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isGenerating, isCancelled, onSendNow]);

  const handleCancel = () => {
    setIsCancelled(true);
    onCancel();
  };

  const handleSendNow = () => {
    setIsCancelled(true);
    onSendNow();
  };

  if (isGenerating) {
    return (
      <Card className="p-4 border-blue-200 bg-blue-50">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-600 animate-pulse" />
          <span className="text-sm font-medium text-blue-800">
            Generating AI message for {leadName}...
          </span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 border-green-200 bg-green-50">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              AI Message Preview
            </span>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeLeft}s
          </Badge>
        </div>

        {/* Lead Context */}
        <div className="text-xs text-green-700">
          <strong>{leadName}</strong>
          {vehicleInterest && <span> • Interested in {vehicleInterest}</span>}
        </div>

        {/* Message Preview */}
        <div className="bg-white rounded-lg p-3 border border-green-200">
          <div className="text-sm text-gray-800 whitespace-pre-wrap">
            {generatedMessage}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            className="text-xs"
          >
            <X className="w-3 h-3 mr-1" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSendNow}
            className="text-xs"
          >
            <Send className="w-3 h-3 mr-1" />
            Send Now
          </Button>
        </div>

        {/* Countdown Bar */}
        <div className="w-full bg-green-200 rounded-full h-1">
          <div 
            className="bg-green-600 h-1 rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / countdownSeconds) * 100}%` }}
          />
        </div>
      </div>
    </Card>
  );
};

export default AIMessagePreviewPanel;
