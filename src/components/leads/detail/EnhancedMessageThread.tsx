
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import type { MessageData } from "@/types/conversation";
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import DateSeparator from './DateSeparator';
import MessageEmptyState from './MessageEmptyState';

interface EnhancedMessageThreadProps {
  messages: MessageData[];
  onSendMessage: (message: string) => Promise<void>;
  isLoading?: boolean;
  leadName: string;
  disabled?: boolean;
}

const EnhancedMessageThread: React.FC<EnhancedMessageThreadProps> = ({
  messages,
  onSendMessage,
  isLoading = false,
  leadName,
  disabled = false
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending || disabled) return;

    setSending(true);
    setError(null);
    
    try {
      await onSendMessage(newMessage.trim());
      setNewMessage('');
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "There was an error sending your message. Please try again.";
      
      setError(errorMessage);
      toast({
        title: "Failed to send message",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const groupedMessages = messages.reduce((groups, message) => {
    const date = format(new Date(message.sentAt), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, MessageData[]>);

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="flex items-center justify-between">
          <span>Messages</span>
          <Badge variant="outline">{messages.length} messages</Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 pb-4">
            {Object.entries(groupedMessages).map(([date, dayMessages]) => (
              <div key={date}>
                <DateSeparator date={date} />
                
                {dayMessages.map((message) => (
                  <MessageBubble 
                    key={message.id} 
                    message={message} 
                    leadName={leadName} 
                  />
                ))}
              </div>
            ))}
            
            {messages.length === 0 && <MessageEmptyState />}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        <MessageInput
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          onSendMessage={handleSendMessage}
          sending={sending}
          isLoading={isLoading}
          disabled={disabled}
          error={error}
        />
      </CardContent>
    </Card>
  );
};

export default EnhancedMessageThread;
