
import React, { useState } from 'react';
import { format } from 'date-fns';
import { Bot, ThumbsUp, ThumbsDown, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MessageData } from '@/types/conversation';

interface EnhancedMessageBubbleProps {
  message: MessageData & {
    leadName?: string;
    vehicleInterest?: string;
  };
  onRetry?: () => void;
  onFeedback?: (
    messageContent: string,
    feedbackType: 'positive' | 'negative' | 'neutral',
    rating?: number,
    suggestions?: string
  ) => void;
}

const EnhancedMessageBubble: React.FC<EnhancedMessageBubbleProps> = ({ 
  message, 
  onRetry,
  onFeedback 
}) => {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  
  const isOutgoing = message.direction === 'out';
  const timestamp = new Date(message.sentAt);
  
  const getStatusIcon = () => {
    if (message.direction === 'in') {
      return <CheckCircle className="w-3 h-3 text-green-500" />;
    }
    
    switch (message.smsStatus) {
      case 'sent':
      case 'delivered':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'pending':
        return <Clock className="w-3 h-3 text-yellow-500 animate-pulse" />;
      case 'failed':
        return <AlertTriangle className="w-3 h-3 text-red-500" />;
      default:
        return <CheckCircle className="w-3 h-3 text-green-500" />;
    }
  };

  const handleFeedback = (feedbackType: 'positive' | 'negative') => {
    if (onFeedback) {
      onFeedback(message.body, feedbackType);
      setFeedbackSubmitted(true);
      setShowFeedback(false);
    }
  };

  return (
    <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in`}>
      <div className={`max-w-xs lg:max-w-md relative transition-all duration-200 hover:shadow-[var(--shadow-elegant)] ${
        isOutgoing 
          ? 'bg-gradient-to-br from-primary to-primary-glow text-primary-foreground rounded-l-lg rounded-tr-lg shadow-[var(--shadow-glow)]' 
          : 'bg-card/60 backdrop-blur-xl border border-border/30 rounded-r-lg rounded-tl-lg'
      } px-4 py-2`}>
        
        {/* AI Generated Badge */}
        {message.aiGenerated && (
          <div className="flex items-center gap-1 mb-1">
            <Bot className="w-3 h-3" />
            <Badge variant="gradient" className="text-xs py-0 px-1 shadow-[var(--shadow-glow)]">
              AI Generated
            </Badge>
          </div>
        )}
        
        {/* Message Text */}
        <div className="break-words mb-2">
          {message.body}
        </div>
        
        {/* Message Status and Timestamp */}
        <div className={`flex items-center justify-between gap-2 ${
          isOutgoing ? 'text-blue-100' : 'text-gray-500'
        }`}>
          <div className="text-xs">
            {format(timestamp, 'HH:mm')}
          </div>
          <div className="flex items-center gap-1">
            {getStatusIcon()}
          </div>
        </div>

        {/* AI Message Feedback for Outgoing AI Messages */}
        {isOutgoing && message.aiGenerated && onFeedback && (
          <div className="mt-2 pt-2 border-t border-blue-500/20">
            {!feedbackSubmitted ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-100">Rate this AI message:</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleFeedback('positive')}
                  className="h-6 w-6 p-0 text-blue-100 hover:text-green-400 hover:bg-blue-700"
                >
                  <ThumbsUp className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleFeedback('negative')}
                  className="h-6 w-6 p-0 text-blue-100 hover:text-red-400 hover:bg-blue-700"
                >
                  <ThumbsDown className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-400" />
                <span className="text-xs text-blue-100">Feedback submitted</span>
              </div>
            )}
          </div>
        )}

        {/* Error State with Retry */}
        {message.smsStatus === 'failed' && onRetry && (
          <div className="mt-2 pt-2 border-t border-red-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs text-red-100">Failed to send</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={onRetry}
                className="h-6 text-xs text-red-100 hover:text-white hover:bg-red-600"
              >
                Retry
              </Button>
            </div>
            {message.smsError && (
              <p className="text-xs text-red-200 mt-1">{message.smsError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedMessageBubble;
