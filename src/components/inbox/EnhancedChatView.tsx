
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  MessageSquare, 
  Phone, 
  CheckCheck, 
  ArrowDown,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface EnhancedChatViewProps {
  selectedConversation: any;
  messages: any[];
  onSendMessage: (message: string) => Promise<void>;
  showTemplates: boolean;
  onToggleTemplates: () => void;
  user: {
    role: string;
    id: string;
  };
  isLoading: boolean;
}

const EnhancedChatView: React.FC<EnhancedChatViewProps> = ({
  selectedConversation,
  messages,
  onSendMessage,
  isLoading,
  user
}) => {
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? 'smooth' : 'instant' 
    });
  };

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollToBottom(!isNearBottom && messages.length > 5);
    }
  };

  useEffect(() => {
    // Always scroll to bottom when new messages arrive
    scrollToBottom(false);
  }, [messages.length]);

  useEffect(() => {
    // Scroll to bottom when conversation changes
    if (selectedConversation) {
      scrollToBottom(false);
    }
  }, [selectedConversation?.leadId]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || sending || isLoading) return;
    
    setSending(true);
    try {
      await onSendMessage(messageText.trim());
      setMessageText('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const findLatestInboundMessage = () => {
    const inboundMessages = messages.filter(msg => msg.direction === 'in');
    return inboundMessages[inboundMessages.length - 1];
  };

  const scrollToLatestInbound = () => {
    const latestInbound = findLatestInboundMessage();
    if (latestInbound) {
      const messageElement = document.getElementById(`message-${latestInbound.id}`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  if (!selectedConversation) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center">
          <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Select a conversation
          </h3>
          <p className="text-gray-500">
            Choose a conversation from the list to start messaging
          </p>
        </CardContent>
      </Card>
    );
  }

  const latestInbound = findLatestInboundMessage();
  const canReply = selectedConversation.lastMessageDirection === 'in' || selectedConversation.unreadCount > 0;

  return (
    <Card className="h-full flex flex-col">
      {/* Header */}
      <CardHeader className="flex-shrink-0 border-b bg-white">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <span>{selectedConversation.leadName}</span>
              {selectedConversation.unreadCount > 0 && (
                <Badge variant="destructive">{selectedConversation.unreadCount} unread</Badge>
              )}
            </CardTitle>
            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
              <div className="flex items-center space-x-1">
                <Phone className="h-4 w-4" />
                <span>{selectedConversation.leadPhone}</span>
              </div>
              <span>•</span>
              <span>{selectedConversation.vehicleInterest}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {latestInbound && (
              <Button
                variant="outline"
                size="sm"
                onClick={scrollToLatestInbound}
                className="flex items-center space-x-2"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Latest Message</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Messages Container - Flexible height */}
      <div className="flex-1 relative min-h-0">
        <div 
          ref={messagesContainerRef}
          className="absolute inset-0 overflow-y-auto p-4 space-y-4"
          onScroll={handleScroll}
        >
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No messages yet</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={message.id || index}
                id={`message-${message.id}`}
                className={`flex ${message.direction === 'out' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.direction === 'out'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900 border-l-4 border-blue-500'
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
        </div>

        {/* Scroll to bottom button */}
        {showScrollToBottom && (
          <Button
            className="absolute bottom-4 right-4 rounded-full h-10 w-10 p-0 shadow-lg"
            onClick={() => scrollToBottom()}
            size="sm"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Message Input - Fixed at bottom */}
      {canReply && (
        <div className="flex-shrink-0 border-t bg-white p-4">
          <div className="flex space-x-2">
            <Textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 min-h-[44px] max-h-32 resize-none"
              disabled={sending || isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!messageText.trim() || sending || isLoading}
              size="sm"
              className="self-end px-4 h-[44px]"
            >
              {sending || isLoading ? (
                <Clock className="h-4 w-4 animate-pulse" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      )}
    </Card>
  );
};

export default EnhancedChatView;
