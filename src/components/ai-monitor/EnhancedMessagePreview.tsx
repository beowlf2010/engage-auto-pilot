
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Brain, TrendingUp, Star, Lightbulb } from 'lucide-react';
import MessageFeedbackPanel from './MessageFeedbackPanel';
import { useAILearning } from '@/hooks/useAILearning';

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

  React.useEffect(() => {
    if (messageContent) {
      analyzeEffectiveness(messageContent);
    }
  }, [messageContent, analyzeEffectiveness]);

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

  return (
    <div className="space-y-4">
      {/* Enhanced Message Preview Card */}
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-sm">AI Message for {leadName}</span>
              {effectiveness && (
                <Badge 
                  variant="outline" 
                  className={getEffectivenessColor(effectiveness.effectivenessScore)}
                >
                  <Brain className="w-3 h-3 mr-1" />
                  {getEffectivenessLabel(effectiveness.effectivenessScore)}
                </Badge>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFeedback(!showFeedback)}
              className="h-6 px-2"
            >
              <Star className="w-3 h-3 mr-1" />
              Rate Message
            </Button>
          </div>

          {/* Message Content */}
          <div className="bg-muted p-3 rounded text-sm">
            {messageContent}
          </div>

          {/* AI Insights */}
          {effectiveness && !loading && (
            <div className="bg-blue-50 p-3 rounded space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-800">
                <Brain className="w-4 h-4" />
                AI Learning Insights
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Effectiveness Score: </span>
                  <span className={`font-medium ${getEffectivenessColor(effectiveness.effectivenessScore)}`}>
                    {effectiveness.effectivenessScore.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Based on: </span>
                  <span className="font-medium">
                    {effectiveness.historicalFeedback.length} previous messages
                  </span>
                </div>
              </div>

              {/* Recommendations */}
              {effectiveness.recommendations && effectiveness.recommendations.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs font-medium text-blue-800">
                    <Lightbulb className="w-3 h-3" />
                    Recommendations:
                  </div>
                  {effectiveness.recommendations.map((rec: string, index: number) => (
                    <div key={index} className="text-xs text-blue-700 ml-4">
                      • {rec}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={onMessageSent}
              className="flex-1"
            >
              <MessageSquare className="w-3 h-3 mr-1" />
              Send Message
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowFeedback(true)}
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              Provide Feedback
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Panel */}
      {showFeedback && (
        <MessageFeedbackPanel
          leadId={leadId}
          conversationId={conversationId}
          messageContent={messageContent}
          onFeedbackSubmitted={() => {
            setShowFeedback(false);
            onFeedbackSubmitted?.();
          }}
        />
      )}
    </div>
  );
};

export default EnhancedMessagePreview;
