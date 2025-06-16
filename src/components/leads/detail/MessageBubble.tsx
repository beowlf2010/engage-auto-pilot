
import React from 'react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format, isToday, isYesterday } from "date-fns";
import MessageStatusIcon from './MessageStatusIcon';
import type { MessageData } from "@/types/conversation";

interface MessageBubbleProps {
  message: MessageData;
  leadName: string;
}

const formatMessageTime = (timestamp: string) => {
  const date = new Date(timestamp);
  
  if (isToday(date)) {
    return format(date, 'h:mm a');
  } else if (isYesterday(date)) {
    return `Yesterday ${format(date, 'h:mm a')}`;
  } else {
    return format(date, 'MMM d, h:mm a');
  }
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, leadName }) => {
  return (
    <div
      className={`flex items-start space-x-3 mb-4 ${
        message.direction === 'out' ? 'flex-row-reverse space-x-reverse' : ''
      }`}
    >
      <Avatar className="w-8 h-8">
        <AvatarFallback className={`text-xs ${
          message.direction === 'out' 
            ? 'bg-blue-100 text-blue-700' 
            : 'bg-gray-100 text-gray-700'
        }`}>
          {message.direction === 'out' ? 'You' : leadName.split(' ').map(n => n[0]).join('')}
        </AvatarFallback>
      </Avatar>
      
      <div className={`flex-1 max-w-[70%] ${
        message.direction === 'out' ? 'text-right' : ''
      }`}>
        <div className={`rounded-lg p-3 ${
          message.direction === 'out'
            ? 'bg-blue-600 text-white ml-auto'
            : 'bg-gray-100 text-gray-900'
        }`}>
          <p className="text-sm whitespace-pre-wrap">{message.body}</p>
        </div>
        
        <div className={`flex items-center space-x-2 mt-1 text-xs text-muted-foreground ${
          message.direction === 'out' ? 'justify-end' : ''
        }`}>
          <span>{formatMessageTime(message.sentAt)}</span>
          {message.direction === 'out' && (
            <MessageStatusIcon 
              status={message.smsStatus} 
              aiGenerated={message.aiGenerated} 
            />
          )}
          {message.aiGenerated && message.direction === 'out' && (
            <Badge variant="secondary" className="text-xs">AI</Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
