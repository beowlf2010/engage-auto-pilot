import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  Phone, 
  Video, 
  MoreVertical, 
  Bot, 
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  User,
  Car
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ConversationListItem } from '@/types/conversation';

interface Message {
  id: string;
  body: string;
  direction: 'in' | 'out';
  sent_at: string;
  ai_generated?: boolean;
  read_at?: string;
}

interface ChatInterfaceProps {
  conversation: ConversationListItem | null;
  onClose?: () => void;
  onMessageSent?: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  conversation,
  onClose,
  onMessageSent
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load messages for the conversation
  useEffect(() => {
    if (!conversation?.leadId) return;

    const loadMessages = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('conversations')
          .select('*')
          .eq('lead_id', conversation.leadId)
          .order('sent_at', { ascending: true });

        if (error) throw error;
        
        // Type assertion to ensure direction is properly typed
        const typedMessages = (data || []).map(msg => ({
          ...msg,
          direction: msg.direction as 'in' | 'out'
        }));
        
        setMessages(typedMessages);
      } catch (error) {
        console.error('Error loading messages:', error);
        toast({
          title: "Error",
          description: "Failed to load conversation messages",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [conversation?.leadId, toast]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time message subscription
  useEffect(() => {
    if (!conversation?.leadId) return;

    const channel = supabase
      .channel(`conversation-${conversation.leadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
          filter: `lead_id=eq.${conversation.leadId}`
        },
        (payload) => {
          const newMessage = {
            ...payload.new,
            direction: payload.new.direction as 'in' | 'out'
          } as Message;
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.leadId]);

  // Generate AI suggestions
  const generateAISuggestions = useCallback(async () => {
    if (!conversation || !messages.length) return;

    setIsGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-response', {
        body: {
          conversation: {
            leadId: conversation.leadId,
            leadName: conversation.leadName,
            vehicleInterest: conversation.vehicleInterest,
            messages: messages.slice(-5) // Last 5 messages for context
          },
          type: 'suggestions'
        }
      });

      if (error) throw error;
      
      if (data?.suggestions) {
        setAiSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
    } finally {
      setIsGeneratingAI(false);
    }
  }, [conversation, messages]);

  // Load AI suggestions when conversation changes
  useEffect(() => {
    if (messages.length > 0) {
      generateAISuggestions();
    }
  }, [messages.length, generateAISuggestions]);

  const sendMessage = async (messageText: string, isAI = false) => {
    if (!messageText.trim() || !conversation?.leadId || !user) return;

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('conversations')
        .insert({
          lead_id: conversation.leadId,
          body: messageText.trim(),
          direction: 'out',
          ai_generated: isAI,
          sent_at: new Date().toISOString()
        });

      if (error) throw error;

      setNewMessage('');
      setAiSuggestions([]);
      onMessageSent?.();
      
      toast({
        title: "Message sent",
        description: isAI ? "AI-generated message sent successfully" : "Message sent successfully"
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMessage = () => {
    sendMessage(newMessage);
  };

  const handleUseSuggestion = (suggestion: string) => {
    sendMessage(suggestion, true);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
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
          <h3 className="text-lg font-semibold mb-2">No conversation selected</h3>
          <p className="text-muted-foreground">Choose a conversation to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Chat Header */}
      <CardHeader className="border-b bg-card p-3 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm md:text-base truncate">{conversation.leadName}</h3>
              <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                {conversation.leadPhone && (
                  <span className="truncate">{conversation.leadPhone}</span>
                )}
                {conversation.vehicleInterest && (
                  <>
                    <Separator orientation="vertical" className="h-3" />
                    <div className="flex items-center gap-1 min-w-0">
                      <Car className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate max-w-24 md:max-w-32">{conversation.vehicleInterest}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 md:gap-2">
            {conversation.aiOptIn && (
              <Badge variant="secondary" className="gap-1 text-xs hidden sm:flex">
                <Bot className="h-3 w-3" />
                AI Active
              </Badge>
            )}
            {conversation.unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {conversation.unreadCount}
              </Badge>
            )}
            <Button variant="ghost" size="sm" className="hidden md:flex">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="hidden md:flex">
              <Video className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 p-3 md:p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No messages yet</p>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                Start the conversation with {conversation.leadName}
              </p>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4 animate-fade-in">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.direction === 'out' ? 'justify-end' : 'justify-start'
                  } animate-scale-in`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div
                    className={`max-w-[85%] md:max-w-[70%] rounded-lg px-3 py-2 md:px-4 md:py-2 transition-all duration-200 hover:shadow-sm ${
                      message.direction === 'out'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.body}</p>
                    <div className={`flex items-center gap-1 mt-1 text-xs ${
                      message.direction === 'out' 
                        ? 'text-primary-foreground/70' 
                        : 'text-muted-foreground'
                    }`}>
                      <Clock className="h-3 w-3" />
                      <span>{formatTime(message.sent_at)}</span>
                      {message.ai_generated && (
                        <>
                          <Bot className="h-3 w-3 ml-1" />
                          <span className="hidden sm:inline">AI</span>
                        </>
                      )}
                      {message.direction === 'out' && (
                        <CheckCircle2 className="h-3 w-3 ml-1" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* AI Suggestions */}
        {aiSuggestions.length > 0 && (
          <div className="border-t bg-muted/30 p-3 animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">AI Suggestions</span>
              {isGeneratingAI && <Loader2 className="h-3 w-3 animate-spin" />}
            </div>
            <div className="space-y-2">
              {aiSuggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="h-auto p-2 text-left justify-start whitespace-normal w-full text-xs md:text-sm hover-scale"
                  onClick={() => handleUseSuggestion(suggestion)}
                  disabled={isSending}
                >
                  <span>{suggestion}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Message Input */}
        <CardContent className="border-t bg-card p-3 md:p-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Message ${conversation.leadName}...`}
                disabled={isSending}
                className="resize-none text-sm md:text-base"
              />
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isSending}
              size="sm"
              className="hover-scale"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span>Online</span>
            </div>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">Press Enter to send</span>
            {conversation.aiOptIn && (
              <>
                <span className="hidden md:inline">•</span>
                <div className="flex items-center gap-1">
                  <Bot className="h-3 w-3" />
                  <span className="hidden md:inline">AI assistance enabled</span>
                  <span className="md:hidden">AI enabled</span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </div>
    </div>
  );
};