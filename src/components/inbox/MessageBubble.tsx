
import React from 'react';
import { format } from 'date-fns';
import { Bot } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import EnhancedMessageStatus from './EnhancedMessageStatus';

interface MessageBubbleProps {
  message: {
    id: string;
    body: string;
    direction: 'in' | 'out';
    sentAt: string;
    smsStatus?: string;
    aiGenerated?: boolean;
    smsError?: string;
  };
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isOutgoing = message.direction === 'out';
  const timestamp = new Date(message.sentAt);
  
  // Determine message status for enhanced display
  const getMessageStatus = () => {
    if (message.direction === 'in') {
      return { status: 'sent' as const, timestamp };
    }
    
    switch (message.smsStatus) {
      case 'sent':
      case 'delivered':
        return { status: 'sent' as const, timestamp };
      case 'pending':
        return { status: 'pending' as const, timestamp };
      case 'failed':
        return { 
          status: 'failed' as const, 
          timestamp,
          error: message.smsError || 'SMS delivery failed'
        };
      default:
        return { status: 'sent' as const, timestamp };
    }
  };

  const messageStatus = getMessageStatus();

  return (
    <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg relative ${
        isOutgoing 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-200 text-gray-900'
      }`}>
        {/* AI Generated Badge */}
        {message.aiGenerated && (
          <div className="flex items-center gap-1 mb-1">
            <Bot className="w-3 h-3" />
            <Badge variant="secondary" className="text-xs py-0 px-1">
              AI
            </Badge>
          </div>
        )}
        
        {/* Message Text */}
        <div className="break-words">
          {message.body}
        </div>
        
        {/* Enhanced Status and Timestamp */}
        <div className={`flex items-center justify-between mt-2 gap-2 ${
          isOutgoing ? 'text-blue-100' : 'text-gray-500'
        }`}>
          <div className="text-xs">
            {format(timestamp, 'HH:mm')}
          </div>
          
          {isOutgoing && (
            <EnhancedMessageStatus
              messageId={message.id}
              status={messageStatus}
              showRetryButton={false} // Don't show retry in message bubbles
            />
          )}
        </div>
        
        {/* Error Display */}
        {message.smsStatus === 'failed' && message.smsError && (
          <div className="mt-1 text-xs text-red-200 bg-red-500/20 rounded px-2 py-1">
            Error: {message.smsError}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
