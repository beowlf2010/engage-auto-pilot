
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Star, ThumbsUp, ThumbsDown, MessageSquare, Brain } from 'lucide-react';
import { aiLearningService } from '@/services/aiLearningService';
import { toast } from '@/hooks/use-toast';

interface InlineMessageFeedbackProps {
  leadId: string;
  messageContent: string;
  conversationId?: string;
  onFeedbackSubmitted?: () => void;
  compact?: boolean;
}

const InlineMessageFeedback = ({ 
  leadId, 
  messageContent, 
  conversationId, 
  onFeedbackSubmitted,
  compact = false 
}: InlineMessageFeedbackProps) => {
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleQuickFeedback = async (type: 'positive' | 'negative' | 'neutral', rating: number) => {
    try {
      setSubmitting(true);
      
      await aiLearningService.submitMessageFeedback({
        leadId,
        conversationId,
        messageContent,
        feedbackType: type,
        rating
      });

      setFeedbackGiven(true);
      
      toast({
        title: "Feedback Recorded",
        description: "Thanks! This helps improve our AI messaging.",
      });

      onFeedbackSubmitted?.();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to record feedback. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (feedbackGiven) {
    return (
      <Badge variant="outline" className="text-xs">
        <Brain className="w-3 h-3 mr-1" />
        Learning recorded
      </Badge>
    );
  }

  if (compact) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
            <Star className="w-3 h-3 mr-1" />
            Rate
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" side="top">
          <div className="space-y-2">
            <p className="text-xs font-medium">How was this AI message?</p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickFeedback('positive', 5)}
                disabled={submitting}
                className="flex-1"
              >
                <ThumbsUp className="w-3 h-3 mr-1" />
                Good
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickFeedback('neutral', 3)}
                disabled={submitting}
                className="flex-1"
              >
                OK
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickFeedback('negative', 2)}
                disabled={submitting}
                className="flex-1"
              >
                <ThumbsDown className="w-3 h-3 mr-1" />
                Poor
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="flex gap-1 mt-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleQuickFeedback('positive', 4)}
        disabled={submitting}
        className="text-xs"
      >
        <ThumbsUp className="w-3 h-3 mr-1" />
        Good
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleQuickFeedback('negative', 2)}
        disabled={submitting}
        className="text-xs"
      >
        <ThumbsDown className="w-3 h-3 mr-1" />
        Needs Work
      </Button>
    </div>
  );
};

export default InlineMessageFeedback;
