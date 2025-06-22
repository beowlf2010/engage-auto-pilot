
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Send, ThumbsUp, ThumbsDown, BarChart3, Lightbulb } from 'lucide-react';
import { realtimeLearningService } from '@/services/realtimeLearningService';
import { useRealtimeLearning } from '@/hooks/useRealtimeLearning';

interface AILearningMessageWrapperProps {
  leadId: string;
  leadName: string;
  messageContent: string;
  onSendMessage: (message: string) => Promise<void>;
  showLearningInsights?: boolean;
  conversationContext?: any;
}

const AILearningMessageWrapper: React.FC<AILearningMessageWrapperProps> = ({
  leadId,
  leadName,
  messageContent,
  onSendMessage,
  showLearningInsights = true,
  conversationContext
}) => {
  const [isSending, setIsSending] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [learningProfile, setLearningProfile] = useState<any>(null);

  const { 
    learningInsights, 
    submitRealtimeFeedback, 
    trackMessageOutcome,
    isLearning
  } = useRealtimeLearning(leadId);

  useEffect(() => {
    loadLearningProfile();
  }, [leadId]);

  const loadLearningProfile = async () => {
    try {
      const profile = await realtimeLearningService.getLeadLearningProfile(leadId);
      setLearningProfile(profile);
    } catch (error) {
      console.error('Error loading learning profile:', error);
    }
  };

  const handleSendMessage = async () => {
    setIsSending(true);
    try {
      // Send the message
      await onSendMessage(messageContent);
      
      // Track learning event
      await realtimeLearningService.processLearningEvent({
        type: 'message_sent',
        leadId,
        data: {
          content: messageContent,
          stage: conversationContext?.stage || 'follow_up',
          messageLength: messageContent.length
        },
        timestamp: new Date()
      });

      // Track message outcome
      await trackMessageOutcome(messageContent, 'no_response');
      
      // Show feedback option
      setShowFeedback(true);
      
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleFeedback = async (type: 'positive' | 'negative', rating?: number) => {
    try {
      await submitRealtimeFeedback(messageContent, type, rating, feedbackText);
      setShowFeedback(false);
      setFeedbackRating(null);
      setFeedbackText('');
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const getLearningInsights = () => {
    if (!learningProfile?.insights) return [];
    return learningProfile.insights.slice(0, 3);
  };

  const getResponsePatternInfo = () => {
    const patterns = learningProfile?.responsePatterns;
    if (!patterns) return null;
    
    return {
      avgResponseTime: patterns.avg_response_time_hours,
      bestHours: patterns.best_response_hours || [],
      engagementScore: patterns.engagement_score || 0.5
    };
  };

  return (
    <div className="space-y-4">
      {/* Main Message Card */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="w-4 h-4 text-blue-600" />
              AI Message for {leadName}
              {isLearning && (
                <Badge variant="outline" className="text-xs">
                  <Brain className="w-3 h-3 mr-1 animate-pulse" />
                  Learning...
                </Badge>
              )}
            </CardTitle>
            
            {learningProfile && (
              <Badge variant="secondary" className="text-xs">
                Engagement: {Math.round((getResponsePatternInfo()?.engagementScore || 0.5) * 100)}%
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Message Content */}
          <div className="bg-muted p-3 rounded text-sm">
            {messageContent}
          </div>

          {/* Learning Insights Preview */}
          {showLearningInsights && getLearningInsights().length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">Learning Insights</span>
              </div>
              <div className="space-y-1">
                {getLearningInsights().map((insight: any, index: number) => (
                  <div key={index} className="text-xs text-amber-700">
                    • {insight.insight_title}: {insight.insight_description}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Response Pattern Info */}
          {getResponsePatternInfo() && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <BarChart3 className="w-3 h-3" />
                Avg Response: {Math.round(getResponsePatternInfo()!.avgResponseTime || 0)}h
              </div>
              {getResponsePatternInfo()!.bestHours.length > 0 && (
                <div>
                  Best Hours: {getResponsePatternInfo()!.bestHours.slice(0, 3).join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <Button 
              onClick={handleSendMessage} 
              disabled={isSending}
              className="flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {isSending ? 'Sending...' : 'Send Message'}
            </Button>
            
            {!showFeedback && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFeedback('positive')}
                  className="flex items-center gap-1"
                >
                  <ThumbsUp className="w-3 h-3" />
                  Good
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFeedback('negative')}
                  className="flex items-center gap-1"
                >
                  <ThumbsDown className="w-3 h-3" />
                  Improve
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feedback Panel */}
      {showFeedback && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Provide Learning Feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Rating */}
            <div>
              <label className="text-xs font-medium mb-2 block">Rate this message (1-5):</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <Button
                    key={rating}
                    variant={feedbackRating === rating ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFeedbackRating(rating)}
                  >
                    {rating}
                  </Button>
                ))}
              </div>
            </div>

            {/* Feedback Text */}
            <div>
              <label className="text-xs font-medium mb-2 block">Suggestions for improvement:</label>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="w-full p-2 border rounded text-sm resize-none"
                rows={3}
                placeholder="How can this message be improved?"
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleFeedback('positive', feedbackRating || undefined)}
                disabled={!feedbackRating}
              >
                Submit Positive Feedback
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFeedback('negative', feedbackRating || undefined)}
                disabled={!feedbackRating}
              >
                Submit Improvement Feedback
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AILearningMessageWrapper;
