
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, MessageSquare, Phone, Clock, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ConversationAdvancementButton } from './ConversationAdvancementButton';

interface ConversationViewProps {
  conversation: any;
  messages: any[];
  onSendMessage: (message: string) => Promise<void>;
  sending: boolean;
  onMarkAsRead: () => Promise<void>;
  canReply: boolean;
  onBack?: () => void;
  loading?: boolean;
  error?: string;
}

const ConversationView = ({
  conversation,
  messages,
  onSendMessage,
  sending,
  onMarkAsRead,
  canReply
}: ConversationViewProps) => {
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || sending) return;
    
    try {
      await onSendMessage(messageText.trim());
      setMessageText('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Select a conversation
          </h3>
          <p className="text-gray-500">
            Choose a conversation from the list to start messaging
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <CardHeader className="border-b bg-white">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <span>{conversation.leadName}</span>
              {conversation.unreadCount > 0 && (
                <Badge variant="destructive">{conversation.unreadCount} unread</Badge>
              )}
            </CardTitle>
            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
              <div className="flex items-center space-x-1">
                <Phone className="h-4 w-4" />
                <span>{conversation.leadPhone}</span>
              </div>
              <span>•</span>
              <span>{conversation.vehicleInterest}</span>
            </div>
          </div>
          
          {conversation.unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onMarkAsRead}
              className="flex items-center space-x-2"
            >
              <CheckCheck className="h-4 w-4" />
              <span>Mark as Read</span>
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No messages yet</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={message.id || index}
              className={`flex ${message.direction === 'out' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.direction === 'out'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm">{message.body}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className={`text-xs ${
                    message.direction === 'out' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {formatDistanceToNow(new Date(message.sentAt), { addSuffix: true })}
                  </span>
                  {message.direction === 'out' && message.aiGenerated && (
                    <Badge variant="secondary" className="text-xs ml-2">AI</Badge>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      {/* Conversation Advancement */}
      {messages.length > 0 && (
        <div className="border-t border-b bg-muted/30 p-3">
          <ConversationAdvancementButton
            leadId={conversation.leadId}
            lastMessageDirection={messages[messages.length - 1]?.direction || 'in'}
            timeSinceLastMessage={Math.floor((Date.now() - new Date(messages[messages.length - 1]?.sentAt || Date.now()).getTime()) / (1000 * 60 * 60))}
          />
        </div>
      )}

      {/* Message Input */}
      {canReply && (
        <div className="border-t bg-white p-4">
          <div className="flex space-x-2">
            <Textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 min-h-[40px] max-h-32 resize-none"
              disabled={sending}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!messageText.trim() || sending}
              size="sm"
              className="self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationView;
