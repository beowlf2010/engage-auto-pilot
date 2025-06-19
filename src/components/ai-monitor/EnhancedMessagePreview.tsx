
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Brain, TrendingUp, Star, Lightbulb, Send } from 'lucide-react';
import InlineMessageFeedback from './InlineMessageFeedback';
import LearningInsightsPanel from './LearningInsightsPanel';
import { useAILearning } from '@/hooks/useAILearning';
import { useRealtimeLearning } from '@/hooks/useRealtimeLearning';

interface EnhancedMessagePreviewProps {
  leadId: string;
  leadName: string;
  messageContent: string;
  conversationId?: string;
  onMessageSent?: () => void;
  onFeedbackSubmitted?: () => void;
}

const EnhancedMessagePreview = ({
  leadId,
  leadName,
  messageContent,
  conversationId,
  onMessageSent,
  onFeedbackSubmitted
}: EnhancedMessagePreviewProps) => {
  const [showFeedback, setShowFeedback] = useState(false);
  const { effectiveness, analyzeEffectiveness, loading } = useAILearning(leadId);
  const { learningInsights, trackMessageOutcome } = useRealtimeLearning(leadId);

  React.useEffect(() => {
    if (messageContent) {
      analyzeEffectiveness(messageContent);
    }
  }, [messageContent, analyzeEffectiveness]);

  const handleMessageSent = async () => {
    if (onMessageSent) {
      onMessageSent();
    }
    
    // Track the message outcome
    await trackMessageOutcome(messageContent, 'no_response');
    
    // Show feedback option
    setShowFeedback(true);
  };

  const getEffectivenessColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getEffectivenessLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  // Use real-time insights if available, otherwise fall back to effectiveness data
  const insights = learningInsights || effectiveness;

  return (
    <div className="space-y-4">
      {/* Enhanced Message Preview Card */}
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-sm">AI Message for {leadName}</span>
              {insights && (
                <Badge 
                  variant="outline" 
                  className={getEffectivenessColor(insights.effectivenessScore)}
                >
                  <Brain className="w-3 h-3 mr-1" />
                  {getEffectivenessLabel(insights.effectivenessScore)}
                </Badge>
              )}
            </div>
          </div>

          {/* Message Content */}
          <div className="bg-muted p-3 rounded text-sm">
            {messageContent}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={handleMessageSent}
              className="flex-1"
            >
              <Send className="w-3 h-3 mr-1" />
              Send Message
            </Button>
            
            <InlineMessageFeedback
              leadId={leadId}
              conversationId={conversationId}
              messageContent={messageContent}
              onFeedbackSubmitted={() => {
                setShowFeedback(false);
                onFeedbackSubmitted?.();
              }}
              compact={true}
            />
          </div>
        </CardContent>
      </Card>

      {/* Learning Insights Panel */}
      <LearningInsightsPanel
        leadId={leadId}
        insights={insights}
        loading={loading}
      />

      {/* Detailed Feedback Panel */}
      {showFeedback && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Star className="w-4 h-4" />
              Provide Detailed Feedback
            </h4>
            <InlineMessageFeedback
              leadId={leadId}
              conversationId={conversationId}
              messageContent={messageContent}
              onFeedbackSubmitted={() => {
                setShowFeedback(false);
                onFeedbackSubmitted?.();
              }}
              compact={false}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedMessagePreview;
