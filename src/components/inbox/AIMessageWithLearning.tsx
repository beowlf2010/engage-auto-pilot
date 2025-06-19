
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Brain, Send } from 'lucide-react';
import InlineMessageFeedback from '@/components/ai-monitor/InlineMessageFeedback';
import LearningInsightsPanel from '@/components/ai-monitor/LearningInsightsPanel';
import { useRealtimeLearning } from '@/hooks/useRealtimeLearning';

interface AIMessageWithLearningProps {
  leadId: string;
  leadName: string;
  messageContent: string;
  conversationId?: string;
  onSendMessage: (message: string) => void;
  showInsights?: boolean;
}

const AIMessageWithLearning = ({
  leadId,
  leadName,
  messageContent,
  conversationId,
  onSendMessage,
  showInsights = false
}: AIMessageWithLearningProps) => {
  const [showFeedback, setShowFeedback] = useState(false);
  const { learningInsights, isLearning, trackMessageOutcome } = useRealtimeLearning(leadId);

  const handleSendMessage = async () => {
    // Send the message
    onSendMessage(messageContent);
    
    // Track this as a message sent outcome
    await trackMessageOutcome(messageContent, 'no_response');
    
    // Show feedback option after sending
    setShowFeedback(true);
  };

  return (
    <div className="space-y-3">
      {/* AI Message Preview */}
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-sm">AI Message for {leadName}</span>
                <Badge variant="outline" className="text-xs">
                  <Brain className="w-3 h-3 mr-1" />
                  AI Generated
                </Badge>
              </div>
              
              {isLearning && (
                <Badge variant="outline" className="text-xs">
                  <Brain className="w-3 h-3 mr-1 animate-pulse" />
                  Learning...
                </Badge>
              )}
            </div>

            {/* Message Content */}
            <div className="bg-muted p-3 rounded text-sm">
              {messageContent}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <Button onClick={handleSendMessage} className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Send Message
              </Button>
              
              <InlineMessageFeedback
                leadId={leadId}
                messageContent={messageContent}
                conversationId={conversationId}
                compact={true}
                onFeedbackSubmitted={() => setShowFeedback(false)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Learning Insights Panel */}
      {showInsights && (
        <LearningInsightsPanel
          leadId={leadId}
          insights={learningInsights}
          loading={isLearning}
        />
      )}

      {/* Full Feedback Panel */}
      {showFeedback && (
        <Card>
          <CardContent className="p-4">
            <InlineMessageFeedback
              leadId={leadId}
              messageContent={messageContent}
              conversationId={conversationId}
              onFeedbackSubmitted={() => setShowFeedback(false)}
              compact={false}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIMessageWithLearning;
