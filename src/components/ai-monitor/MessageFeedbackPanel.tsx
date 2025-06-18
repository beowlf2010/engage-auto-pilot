
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Star, ThumbsUp, ThumbsDown, AlertTriangle, Lightbulb } from 'lucide-react';
import { aiLearningService } from '@/services/aiLearningService';
import { toast } from '@/hooks/use-toast';

interface MessageFeedbackPanelProps {
  leadId: string;
  conversationId?: string;
  messageContent: string;
  onFeedbackSubmitted?: () => void;
}

const MessageFeedbackPanel = ({ 
  leadId, 
  conversationId, 
  messageContent, 
  onFeedbackSubmitted 
}: MessageFeedbackPanelProps) => {
  const [feedbackType, setFeedbackType] = useState<'positive' | 'negative' | 'neutral'>('neutral');
  const [rating, setRating] = useState<number>(3);
  const [improvementSuggestions, setImprovementSuggestions] = useState('');
  const [issueCategory, setIssueCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const issueCategories = [
    { value: 'tone', label: 'Tone/Style Issue' },
    { value: 'content', label: 'Content Problem' },
    { value: 'timing', label: 'Poor Timing' },
    { value: 'personalization', label: 'Lacks Personalization' },
    { value: 'compliance', label: 'Compliance Concern' },
    { value: 'other', label: 'Other Issue' }
  ];

  const handleSubmitFeedback = async () => {
    try {
      setSubmitting(true);
      
      await aiLearningService.submitMessageFeedback({
        leadId,
        conversationId,
        messageContent,
        feedbackType,
        rating,
        improvementSuggestions: improvementSuggestions || undefined,
        issueCategory: issueCategory || undefined
      });

      toast({
        title: "Feedback Submitted",
        description: "Thank you for helping improve our AI system!",
      });

      // Reset form
      setImprovementSuggestions('');
      setIssueCategory('');
      setRating(3);
      setFeedbackType('neutral');
      
      onFeedbackSubmitted?.();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="h-5 w-5 text-blue-600" />
          Rate This AI Message
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Message Preview */}
        <div className="bg-muted p-3 rounded text-sm">
          <span className="font-medium">Message: </span>
          {messageContent.length > 150 
            ? `${messageContent.substring(0, 150)}...` 
            : messageContent
          }
        </div>

        {/* Feedback Type */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Overall Assessment</label>
          <div className="flex gap-2">
            <Button
              variant={feedbackType === 'positive' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFeedbackType('positive')}
              className="flex items-center gap-1"
            >
              <ThumbsUp className="h-4 w-4" />
              Good
            </Button>
            <Button
              variant={feedbackType === 'neutral' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFeedbackType('neutral')}
            >
              Neutral
            </Button>
            <Button
              variant={feedbackType === 'negative' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFeedbackType('negative')}
              className="flex items-center gap-1"
            >
              <ThumbsDown className="h-4 w-4" />
              Needs Work
            </Button>
          </div>
        </div>

        {/* Rating */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Quality Rating</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Button
                key={star}
                variant="ghost"
                size="sm"
                onClick={() => setRating(star)}
                className="p-1"
              >
                <Star 
                  className={`h-5 w-5 ${
                    star <= rating 
                      ? 'fill-yellow-400 text-yellow-400' 
                      : 'text-gray-300'
                  }`} 
                />
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {rating}/5 - {
              rating <= 2 ? 'Poor' : 
              rating <= 3 ? 'Average' : 
              rating <= 4 ? 'Good' : 'Excellent'
            }
          </p>
        </div>

        {/* Issue Category (if negative feedback) */}
        {feedbackType === 'negative' && (
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Issue Type
            </label>
            <Select value={issueCategory} onValueChange={setIssueCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select issue type..." />
              </SelectTrigger>
              <SelectContent>
                {issueCategories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Improvement Suggestions */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Suggestions for Improvement (Optional)
          </label>
          <Textarea
            value={improvementSuggestions}
            onChange={(e) => setImprovementSuggestions(e.target.value)}
            placeholder="How could this message be improved?"
            className="min-h-[80px]"
          />
        </div>

        {/* Submit Button */}
        <Button 
          onClick={handleSubmitFeedback}
          disabled={submitting}
          className="w-full"
        >
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </Button>

        {/* Learning Note */}
        <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded">
          <strong>💡 Learning Note:</strong> Your feedback helps our AI learn and improve. 
          This data is used to optimize future message generation and personalization.
        </div>
      </CardContent>
    </Card>
  );
};

export default MessageFeedbackPanel;
