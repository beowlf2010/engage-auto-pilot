
import React, { useRef, useEffect, useState } from 'react';
import { CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, ArrowDown } from 'lucide-react';
import MessageBubble from './MessageBubble';
import SentimentIndicator from '../conversation/SentimentIndicator';

interface MessagesAreaProps {
  messages: any[];
  showScrollButton: boolean;
  getSentimentForMessage: (messageId: string) => any;
  onScroll: () => void;
  onScrollToBottom: () => void;
}

const MessagesArea = ({
  messages,
  showScrollButton,
  getSentimentForMessage,
  onScroll,
  onScrollToBottom
}: MessagesAreaProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [userScrolled, setUserScrolled] = useState(false);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    setUserScrolled(false);
  };

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    setShouldAutoScroll(isAtBottom);
    setUserScrolled(!isAtBottom);
    onScroll();
  };

  // Auto-scroll to bottom when new messages arrive (only if user hasn't scrolled up)
  useEffect(() => {
    if (messages.length > 0 && shouldAutoScroll) {
      setTimeout(() => scrollToBottom(true), 100);
    }
  }, [messages.length, shouldAutoScroll]);

  // Initial scroll to bottom when messages first load
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollToBottom(false), 200);
    }
  }, [messages.length === 1]); // Only on first message load

  const handleScrollToBottomClick = () => {
    scrollToBottom(true);
    onScrollToBottom();
  };

  return (
    <CardContent 
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto p-4 space-y-4 relative"
      onScroll={handleScroll}
    >
      {messages.length === 0 ? (
        <div className="text-center text-slate-500 py-8">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 text-slate-300" />
          <p>No messages yet. Start the conversation!</p>
        </div>
      ) : (
        <>
          {messages.map((message, index) => {
            const sentiment = getSentimentForMessage(message.id);
            const prevMessage = messages[index - 1];
            const showDateSeparator = prevMessage && 
              new Date(message.sentAt).toDateString() !== new Date(prevMessage.sentAt).toDateString();
            
            return (
              <div key={message.id} className="space-y-2">
                {showDateSeparator && (
                  <div className="flex items-center justify-center py-2">
                    <div className="bg-slate-100 px-3 py-1 rounded-full text-xs text-slate-600">
                      {new Date(message.sentAt).toLocaleDateString()}
                    </div>
                  </div>
                )}
                <MessageBubble message={message} />
                {sentiment && message.direction === 'in' && (
                  <div className="flex justify-start">
                    <SentimentIndicator
                      sentimentScore={sentiment.sentimentScore}
                      sentimentLabel={sentiment.sentimentLabel}
                      confidenceScore={sentiment.confidenceScore}
                      emotions={sentiment.emotions}
                      size="sm"
                      showDetails={false}
                    />
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </>
      )}
      
      {/* Scroll to bottom button - show when user has scrolled up */}
      {userScrolled && (
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-32 right-8 rounded-full shadow-lg bg-white hover:bg-slate-50 z-10 border-2"
          onClick={handleScrollToBottomClick}
        >
          <ArrowDown className="h-4 w-4 mr-1" />
          New messages
        </Button>
      )}
    </CardContent>
  );
};

export default MessagesArea;
