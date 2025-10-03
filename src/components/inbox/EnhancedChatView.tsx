
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
  const canReply = true; // Always allow replies

  return (
    <Card className="h-full flex flex-col bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-800 border-none shadow-none">
      {/* Modern Floating Header with Glass Effect */}
      <div className="flex-shrink-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/30 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center space-x-3 text-xl">
                <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent font-bold">
                  {selectedConversation.leadName}
                </span>
                {selectedConversation.unreadCount > 0 && (
                  <Badge 
                    variant="default" 
                    className="bg-gradient-to-r from-primary to-blue-600 shadow-lg shadow-primary/30 animate-pulse-glow px-3 py-1"
                  >
                    {selectedConversation.unreadCount} unread
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-3">
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full border border-blue-100 dark:border-blue-800/30">
                  <Phone className="h-4 w-4 text-primary" />
                  <span className="font-medium">{selectedConversation.leadPhone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-muted-foreground/50">•</span>
                  <span className="font-medium">{selectedConversation.vehicleInterest}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {latestInbound && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={scrollToLatestInbound}
                  className="flex items-center space-x-2 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Latest Message</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </div>

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
                className={`flex ${message.direction === 'out' ? 'justify-end' : 'justify-start'} animate-in fade-in-0 slide-in-from-bottom-2 duration-400`}
                style={{ animationDelay: `${Math.min(index * 50, 500)}ms`, animationFillMode: 'backwards' }}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-5 py-3 rounded-2xl transition-all duration-300 ${
                    message.direction === 'out'
                      ? 'bg-gradient-to-br from-primary via-blue-600 to-blue-700 text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40'
                      : 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-md text-foreground border-l-4 border-primary shadow-md hover:shadow-lg'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.body}</p>
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <span className={`text-xs font-medium ${
                      message.direction === 'out' ? 'text-white/80' : 'text-muted-foreground'
                    }`}>
                      {formatDistanceToNow(new Date(message.sentAt), { addSuffix: true })}
                    </span>
                    {message.direction === 'out' && message.aiGenerated && (
                      <Badge 
                        variant="secondary" 
                        className="text-xs ml-2 bg-white/20 dark:bg-white/10 backdrop-blur-sm border-white/30 text-white shadow-sm"
                      >
                        AI
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Modern Floating Scroll to Bottom Button */}
        {showScrollToBottom && (
          <Button
            className="absolute bottom-6 right-6 rounded-full h-12 w-12 p-0 bg-gradient-to-br from-primary to-blue-600 shadow-xl shadow-primary/40 hover:shadow-2xl hover:shadow-primary/50 hover:scale-110 transition-all duration-300 border-2 border-white dark:border-gray-800"
            onClick={() => scrollToBottom()}
            size="sm"
          >
            <ArrowDown className="h-5 w-5 text-white" />
          </Button>
        )}
      </div>

      {/* Modern Floating Input with Glass Effect */}
      {canReply && (
        <div className="flex-shrink-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-700/30 p-4 shadow-lg">
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <Textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 min-h-[56px] max-h-32 resize-none bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 rounded-xl shadow-sm focus:shadow-md"
                disabled={sending || isLoading}
              />
              <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                {messageText.length > 0 && `${messageText.length} chars`}
              </div>
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!messageText.trim() || sending || isLoading}
              size="lg"
              className="self-end px-6 h-[56px] bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-primary shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 hover:scale-105"
            >
              {sending || isLoading ? (
                <Clock className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 px-1">
            <span>Press Enter to send, Shift+Enter for new line</span>
            {messageText.length > 0 && messageText.length < 20 && (
              <span className="text-amber-600 dark:text-amber-400 font-medium">Min 20 characters</span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export default EnhancedChatView;
