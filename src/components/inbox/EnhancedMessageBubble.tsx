
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, AlertTriangle, RefreshCw, Send } from 'lucide-react';
import { MessageData } from '@/types/conversation';

interface EnhancedMessageBubbleProps {
  message: MessageData;
  isOptimistic?: boolean;
  onRetry?: (messageId: string) => void;
  className?: string;
}

const EnhancedMessageBubble: React.FC<EnhancedMessageBubbleProps> = ({
  message,
  isOptimistic = false,
  onRetry,
  className = ""
}) => {
  const isOutgoing = message.direction === 'out';
  const isFailed = message.smsStatus === 'failed' || message.smsStatus === 'error';
  const isPending = message.smsStatus === 'sending' || message.smsStatus === 'pending';
  const isSent = message.smsStatus === 'sent' || message.smsStatus === 'delivered';

  const getStatusIcon = () => {
    if (isFailed) return <AlertTriangle className="w-3 h-3 text-red-500" />;
    if (isPending) return <Clock className="w-3 h-3 text-yellow-500" />;
    if (isSent) return <CheckCircle className="w-3 h-3 text-green-500" />;
    return null;
  };

  const getStatusText = () => {
    if (isFailed) return "Failed";
    if (isPending) return "Sending...";
    if (isSent) return "Sent";
    return "";
  };

  const formatTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return '';
    }
  };

  return (
    <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} mb-4 ${className}`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg relative ${
        isOutgoing
          ? isFailed 
            ? 'bg-red-100 border border-red-300'
            : isPending
            ? 'bg-blue-100 border border-blue-300'
            : 'bg-blue-500 text-white'
          : 'bg-gray-200 text-gray-800'
      } ${isOptimistic ? 'opacity-80' : ''}`}>
        
        {/* Message content */}
        <div className="text-sm mb-1">
          {message.body}
        </div>

        {/* Message footer with timestamp and status */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className={`${isOutgoing && !isFailed && !isPending ? 'text-blue-100' : 'text-gray-500'}`}>
            {formatTime(message.sentAt)}
            {message.aiGenerated && (
              <Badge variant="outline" className="ml-1 text-xs">
                AI
              </Badge>
            )}
          </span>

          {/* Status indicator for outgoing messages */}
          {isOutgoing && (
            <div className="flex items-center gap-1">
              {getStatusIcon()}
              {getStatusText() && (
                <span className={`text-xs ${
                  isFailed ? 'text-red-600' : 
                  isPending ? 'text-yellow-600' : 
                  'text-gray-500'
                }`}>
                  {getStatusText()}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Error message and retry button */}
        {isFailed && message.smsError && (
          <div className="mt-2 pt-2 border-t border-red-200">
            <p className="text-xs text-red-600 mb-2">
              {message.smsError}
            </p>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRetry(message.id)}
                className="h-6 px-2 text-xs bg-white"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            )}
          </div>
        )}

        {/* Optimistic indicator */}
        {isOptimistic && isPending && (
          <div className="absolute -top-1 -right-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedMessageBubble;
