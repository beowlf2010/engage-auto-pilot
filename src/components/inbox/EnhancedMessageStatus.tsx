
import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertTriangle, Loader2, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface MessageStatus {
  status: 'composing' | 'sending' | 'sent' | 'failed' | 'pending';
  error?: string;
  timestamp?: Date;
  retryCount?: number;
}

interface EnhancedMessageStatusProps {
  messageId?: string;
  status: MessageStatus;
  onRetry?: () => void;
  showRetryButton?: boolean;
}

const EnhancedMessageStatus: React.FC<EnhancedMessageStatusProps> = ({
  messageId,
  status,
  onRetry,
  showRetryButton = true
}) => {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (!onRetry) return;
    
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  const getStatusIcon = () => {
    switch (status.status) {
      case 'composing':
        return <Clock className="w-3 h-3 text-gray-400" />;
      case 'sending':
        return <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />;
      case 'sent':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="w-3 h-3 text-red-500" />;
      case 'pending':
        return <Clock className="w-3 h-3 text-yellow-500" />;
      default:
        return <Clock className="w-3 h-3 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (status.status) {
      case 'composing':
        return 'Composing';
      case 'sending':
        return 'Sending...';
      case 'sent':
        return status.timestamp ? `Sent ${status.timestamp.toLocaleTimeString()}` : 'Sent';
      case 'failed':
        return 'Failed to send';
      case 'pending':
        return 'Pending';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'composing':
        return 'default';
      case 'sending':
        return 'default';
      case 'sent':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant={getStatusColor() as any} className="flex items-center gap-1 text-xs">
        {getStatusIcon()}
        {getStatusText()}
      </Badge>
      
      {status.status === 'failed' && status.error && (
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertTriangle className="w-3 h-3 text-red-500 cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs text-xs">{status.error}</p>
          </TooltipContent>
        </Tooltip>
      )}
      
      {status.status === 'failed' && showRetryButton && onRetry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRetry}
          disabled={isRetrying}
          className="h-6 px-2 text-xs"
        >
          {isRetrying ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Send className="w-3 h-3" />
          )}
          Retry {status.retryCount ? `(${status.retryCount})` : ''}
        </Button>
      )}
    </div>
  );
};

export default EnhancedMessageStatus;
