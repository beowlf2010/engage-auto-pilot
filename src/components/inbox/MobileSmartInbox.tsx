
import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, ArrowLeft, RefreshCw, Users, CheckCircle2, Clock, AlertCircle, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SimpleLoading } from '@/components/ui/SimpleLoading';
import { ConversationListItem, MessageData } from '@/hooks/conversation/conversationTypes';
import { useConversationsList } from '@/hooks/conversation/useConversationsList';
import { useRealtimeInbox } from '@/hooks/useRealtimeInbox';
import { useCentralizedRealtime } from '@/hooks/useCentralizedRealtime';
import { format } from 'date-fns';

interface MobileSmartInboxProps {
  onLeadsRefresh: () => void;
  preselectedLeadId?: string | null;
}

const MobileSmartInbox: React.FC<MobileSmartInboxProps> = ({ 
  onLeadsRefresh, 
  preselectedLeadId 
}) => {
  const [selectedLead, setSelectedLead] = useState<string | null>(preselectedLeadId || null);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use the existing hooks for data management
  const { conversations, conversationsLoading, refetchConversations } = useConversationsList();
  const { messages, fetchMessages, sendMessage, loading: messagesLoading, isRealtimeConnected } = useRealtimeInbox();

  // Set up real-time subscriptions
  useCentralizedRealtime({
    onConversationUpdate: () => {
      console.log('📱 [MOBILE INBOX] Conversation update detected, refreshing...');
      refetchConversations();
    },
    onMessageUpdate: (leadId: string) => {
      console.log('📱 [MOBILE INBOX] Message update for lead:', leadId);
      if (selectedLead === leadId) {
        fetchMessages(leadId);
      }
      refetchConversations();
    },
    onUnreadCountUpdate: () => {
      console.log('📱 [MOBILE INBOX] Unread count update, refreshing conversations...');
      refetchConversations();
    }
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load messages when a lead is selected
  useEffect(() => {
    if (selectedLead) {
      console.log('📱 [MOBILE INBOX] Loading messages for lead:', selectedLead);
      fetchMessages(selectedLead);
    }
  }, [selectedLead, fetchMessages]);

  // Set preselected lead if provided
  useEffect(() => {
    if (preselectedLeadId && preselectedLeadId !== selectedLead) {
      setSelectedLead(preselectedLeadId);
    }
  }, [preselectedLeadId, selectedLead]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedLead || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(selectedLead, messageInput.trim());
      setMessageInput('');
      
      // Refresh conversations to update last message and counts
      setTimeout(() => {
        refetchConversations();
      }, 500);
    } catch (error) {
      console.error('📱 [MOBILE INBOX] Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM d, h:mm a');
    } catch {
      return 'Unknown time';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const totalUnreadCount = conversations?.reduce((sum, conv) => sum + conv.unreadCount, 0) || 0;
  const selectedConversation = conversations?.find(conv => conv.leadId === selectedLead);
  
  // Show connection status if there are issues
  const showConnectionIssue = !isRealtimeConnected;

  // Loading states
  if (conversationsLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <SimpleLoading message="Loading conversations..." />
      </div>
    );
  }

  // Emergency fallback for no conversations
  if (!conversations || conversations.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Conversations</h3>
        <p className="text-muted-foreground mb-4">You don't have any conversations yet.</p>
        {showConnectionIssue && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive font-medium">Connection Issue Detected</p>
            <p className="text-xs text-muted-foreground mt-1">
              Real-time updates may be delayed. Try refreshing the page.
            </p>
          </div>
        )}
        <Button onClick={() => refetchConversations()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    );
  }

  // Conversation List View (when no lead is selected)
  if (!selectedLead) {
    return (
      <div className="h-full bg-background">
        <div className="border-b bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <MessageSquare className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">Smart Inbox</h1>
              {totalUnreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {totalUnreadCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {showConnectionIssue && (
                <div className="flex items-center text-destructive text-xs">
                  <div className="w-2 h-2 bg-destructive rounded-full mr-1"></div>
                  Connection Issue
                </div>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => refetchConversations()}
                disabled={conversationsLoading}
              >
                <RefreshCw className={`h-4 w-4 ${conversationsLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {conversations.map((conversation) => (
              <Card 
                key={conversation.leadId}
                className="mb-2 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setSelectedLead(conversation.leadId)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-sm">
                          {getInitials(conversation.leadName)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-sm truncate">
                            {conversation.leadName}
                          </h3>
                          <span className="text-xs text-muted-foreground ml-2">
                            {formatMessageTime(conversation.lastMessageTime)}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2 mb-2">
                          {conversation.primaryPhone && (
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Phone className="h-3 w-3 mr-1" />
                              {conversation.primaryPhone}
                            </div>
                          )}
                          {conversation.vehicleInterest && (
                            <Badge variant="outline" className="text-xs">
                              {conversation.vehicleInterest}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {conversation.lastMessageDirection === 'in' ? '← ' : '→ '}
                          {conversation.lastMessage}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-1 ml-2">
                      {conversation.unreadCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                      <div className="flex items-center space-x-1">
                        {conversation.lastMessageDirection === 'in' && (
                          <CheckCircle2 className="h-3 w-3 text-blue-500" />
                        )}
                        {conversation.lastMessageDirection === 'out' && (
                          <Clock className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Message View (when a lead is selected)
  return (
    <div className="h-full bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSelectedLead(null)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-sm">
                {getInitials(selectedConversation?.leadName || 'Unknown')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold text-sm">
                {selectedConversation?.leadName || 'Unknown Lead'}
              </h2>
              {selectedConversation?.primaryPhone && (
                <p className="text-xs text-muted-foreground">
                  {selectedConversation.primaryPhone}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {selectedConversation?.unreadCount ? (
              <Badge variant="destructive" className="text-xs">
                {selectedConversation.unreadCount}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messagesLoading ? (
          <div className="flex items-center justify-center h-32">
            <SimpleLoading message="Loading messages..." size="sm" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No messages yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={message.id || index}
                className={`flex ${message.direction === 'out' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.direction === 'out'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                  <p className={`text-xs mt-1 ${
                    message.direction === 'out' 
                      ? 'text-primary-foreground/70' 
                      : 'text-muted-foreground'
                  }`}>
                    {formatMessageTime(message.sentAt)}
                    {message.direction === 'out' && message.smsStatus && (
                      <span className="ml-2">
                        {message.smsStatus === 'delivered' && '✓'}
                        {message.smsStatus === 'failed' && '✗'}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Message Input */}
      <div className="border-t bg-card p-4">
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              disabled={isSending}
              className="resize-none"
            />
          </div>
          <Button 
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || isSending}
            size="sm"
          >
            {isSending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MobileSmartInbox;
