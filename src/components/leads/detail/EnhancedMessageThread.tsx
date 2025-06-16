
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, CheckCircle, Clock, AlertTriangle, Bot, User, Shield } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { toast } from "@/hooks/use-toast";
import type { MessageData } from "@/types/conversation";

interface EnhancedMessageThreadProps {
  messages: MessageData[];
  onSendMessage: (message: string) => Promise<void>;
  isLoading?: boolean;
  leadName: string;
  disabled?: boolean;
}

const MessageStatusIcon = ({ status, aiGenerated }: { status?: string; aiGenerated: boolean }) => {
  const iconClass = "w-3 h-3";
  
  if (aiGenerated) {
    return <Bot className={`${iconClass} text-blue-500`} />;
  }
  
  switch (status) {
    case 'delivered':
      return <CheckCircle className={`${iconClass} text-green-500`} />;
    case 'pending':
      return <Clock className={`${iconClass} text-yellow-500`} />;
    case 'failed':
      return <AlertTriangle className={`${iconClass} text-red-500`} />;
    default:
      return <CheckCircle className={`${iconClass} text-gray-400`} />;
  }
};

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span>Messages</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{messages.length} messages</Badge>
            {disabled && (
              <Badge variant="secondary" className="text-orange-700 bg-orange-100">
                <Shield className="w-3 h-3 mr-1" />
                Consent Required
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 pb-4">
            {Object.entries(groupedMessages).map(([date, dayMessages]) => (
              <div key={date}>
                <div className="flex items-center justify-center my-4">
                  <Separator className="flex-1" />
                  <span className="px-3 text-xs text-muted-foreground bg-background">
                    {format(new Date(date), 'MMMM d, yyyy')}
                  </span>
                  <Separator className="flex-1" />
                </div>
                
                {dayMessages.map((message) => (
                  <div
                    key={message.id}
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
                ))}
              </div>
            ))}
            
            {messages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No messages yet</p>
                <p className="text-sm">
                  {disabled ? "Record SMS consent to start messaging" : "Start a conversation to engage with this lead"}
                </p>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        <div className="border-t p-4">
          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          
          <div className="flex space-x-2">
            <Textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={disabled ? "SMS consent required to send messages..." : "Type your message..."}
              className="flex-1 min-h-[40px] max-h-[120px] resize-none"
              disabled={sending || isLoading || disabled}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending || isLoading || disabled}
              size="sm"
              className="px-3"
            >
              {sending ? (
                <Clock className="w-4 h-4" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground mt-2">
            {disabled ? (
              <span className="text-orange-600">Record SMS consent above to enable messaging</span>
            ) : (
              "Press Enter to send, Shift+Enter for new line"
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedMessageThread;
