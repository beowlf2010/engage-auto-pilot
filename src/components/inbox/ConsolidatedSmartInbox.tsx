import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Search, 
  Send, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Loader2,
  Filter,
  X
} from 'lucide-react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { useAuth } from '@/components/auth/AuthProvider';
import { useCentralizedRealtime } from '@/hooks/useCentralizedRealtime';
import { useOptimizedInbox } from '@/hooks/useOptimizedInbox';
import { ConversationListItem, MessageData } from '@/types/conversation';
import { useToast } from '@/hooks/use-toast';
import ConnectionStatusIndicator from './ConnectionStatusIndicator';

interface ConversationProps {
  id: string;
  customerName: string;
  phoneNumber: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  direction: 'in' | 'out';
}

interface MessageProps {
  id: string;
  body: string;
  sentAt: string;
  direction: 'in' | 'out';
  aiGenerated: boolean;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 60) {
    return `${minutes} minutes ago`;
  } else {
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} hours ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
};

export const ConsolidatedSmartInbox: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();

  // State management
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'responded'>('all');
  const [isPollingMode, setIsPollingMode] = useState(false);
  const [lastPollTime, setLastPollTime] = useState<Date | null>(null);

  // Hook for inbox data with fallback polling
  const {
    conversations,
    messages,
    loading,
    error,
    sendingMessage,
    totalConversations,
    loadMessages,
    sendMessage,
    manualRefresh,
    setError
  } = useOptimizedInbox({
    onLeadsRefresh: () => {
      setLastPollTime(new Date());
    }
  });

  // Real-time connection with fallback handling
  const {
    isConnected: realtimeConnected,
    forceRefresh,
    reconnect
  } = useCentralizedRealtime({
    onConversationUpdate: () => {
      console.log('🔄 [CONSOLIDATED INBOX] Conversation update received');
      manualRefresh();
    },
    onMessageUpdate: (leadId: string) => {
      console.log('🔄 [CONSOLIDATED INBOX] Message update for lead:', leadId);
      if (selectedConversation === leadId) {
        loadMessages(leadId);
      }
      manualRefresh();
    },
    onUnreadCountUpdate: () => {
      console.log('🔄 [CONSOLIDATED INBOX] Unread count update');
      manualRefresh();
    }
  });

  // Define connection status structure
  const connectionStatus = useMemo(() => ({
    isConnected: realtimeConnected,
    status: realtimeConnected ? 'connected' as const : (isPollingMode ? 'offline' as const : 'reconnecting' as const),
    lastConnected: realtimeConnected ? new Date() : lastPollTime,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5
  }), [realtimeConnected, isPollingMode, lastPollTime]);

  // Fallback polling mechanism
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    if (!realtimeConnected) {
      console.log('📡 [CONSOLIDATED INBOX] Real-time disconnected, starting fallback polling');
      setIsPollingMode(true);
      
      pollInterval = setInterval(() => {
        console.log('📡 [FALLBACK POLLING] Refreshing conversations');
        manualRefresh();
        setLastPollTime(new Date());
      }, 15000); // Poll every 15 seconds
    } else {
      setIsPollingMode(false);
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [realtimeConnected, manualRefresh]);

  // Error handling with user feedback
  useEffect(() => {
    if (error) {
      toast({
        title: "Connection Error",
        description: isPollingMode 
          ? "Using backup sync mode. Messages may appear with slight delay." 
          : "Failed to load conversations. Retrying...",
        variant: isPollingMode ? "default" : "destructive"
      });
    }
  }, [error, isPollingMode, toast]);

  const filteredConversations = useMemo(() => {
    if (!conversations) return [];
    
    let filtered = conversations;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(conv => 
        conv.customerName.toLowerCase().includes(query) ||
        conv.lastMessage.toLowerCase().includes(query) ||
        conv.phoneNumber.includes(query)
      );
    }
    
    // Apply status filter
    switch (filterStatus) {
      case 'unread':
        filtered = filtered.filter(conv => conv.unreadCount > 0);
        break;
      case 'responded':
        filtered = filtered.filter(conv => conv.unreadCount === 0);
        break;
    }
    
    return filtered;
  }, [conversations, searchQuery, filterStatus]);

  const handleConversationSelect = useCallback(async (conversationId: string) => {
    if (selectedConversation === conversationId) return;
    
    console.log('💬 [CONSOLIDATED INBOX] Selecting conversation:', conversationId);
    setSelectedConversation(conversationId);
    
    try {
      await loadMessages(conversationId);
    } catch (error) {
      console.error('❌ [CONSOLIDATED INBOX] Error loading messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages. Please try again.",
        variant: "destructive"
      });
    }
  }, [selectedConversation, loadMessages, toast]);

  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim() || !selectedConversation || sendingMessage) return;
    
    const messageContent = messageInput.trim();
    setMessageInput('');
    
    try {
      console.log('📤 [CONSOLIDATED INBOX] Sending message to:', selectedConversation);
      await sendMessage(selectedConversation, messageContent);
      
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully.",
      });
    } catch (error) {
      console.error('❌ [CONSOLIDATED INBOX] Error sending message:', error);
      setMessageInput(messageContent); // Restore message input
      
      toast({
        title: "Send Failed",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  }, [messageInput, selectedConversation, sendingMessage, sendMessage, toast]);

  const handleManualRefresh = useCallback(() => {
    console.log('🔄 [CONSOLIDATED INBOX] Manual refresh triggered');
    forceRefresh();
    manualRefresh();
    
    toast({
      title: "Refreshed",
      description: "Conversations have been refreshed.",
    });
  }, [forceRefresh, manualRefresh, toast]);

  const handleReconnect = useCallback(() => {
    console.log('🔌 [CONSOLIDATED INBOX] Manual reconnect triggered');
    reconnect();
    setError(null);
    
    toast({
      title: "Reconnecting",
      description: "Attempting to restore real-time connection...",
    });
  }, [reconnect, setError, toast]);

  const formatMessageTime = useCallback((sentAt: string) => {
    try {
      const date = parseISO(sentAt);
      if (isToday(date)) {
        return format(date, 'HH:mm');
      } else if (isYesterday(date)) {
        return 'Yesterday';
      } else {
        return format(date, 'MMM d');
      }
    } catch {
      return 'Unknown';
    }
  }, []);

  const selectedConversationData = useMemo(() => {
    return conversations?.find(conv => conv.id === selectedConversation);
  }, [conversations, selectedConversation]);

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header with connection status */}
      <div className="border-b bg-card/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold">Smart Inbox</h1>
            <Badge variant="outline" className="text-xs">
              {totalConversations} conversations
            </Badge>
            {isPollingMode && (
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Backup Mode
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <ConnectionStatusIndicator
              connectionState={connectionStatus}
              onReconnect={handleReconnect}
              onForceSync={handleManualRefresh}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Conversation List */}
        <div className="w-1/3 border-r flex flex-col">
          {/* Search and Filter */}
          <div className="p-4 border-b space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex space-x-2">
              {(['all', 'unread', 'responded'] as const).map((status) => (
                <Button
                  key={status}
                  variant={filterStatus === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus(status)}
                  className="text-xs"
                >
                  {status === 'all' ? 'All' : status === 'unread' ? 'Unread' : 'Responded'}
                </Button>
              ))}
            </div>
          </div>

          {/* Conversation List */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-muted rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length > 0 ? (
              <div className="p-2">
                {filteredConversations.map((conversation) => (
                  <Card
                    key={conversation.id}
                    className={`mb-2 cursor-pointer transition-all duration-200 hover:shadow-sm ${
                      selectedConversation === conversation.id 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleConversationSelect(conversation.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-medium text-sm truncate">
                              {conversation.customerName}
                            </h3>
                            {conversation.unreadCount > 0 && (
                              <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mb-1">
                            {conversation.phoneNumber}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {conversation.lastMessage}
                          </p>
                        </div>
                        <div className="flex flex-col items-end space-y-1 ml-2">
                          <span className="text-xs text-muted-foreground">
                            {formatMessageTime(conversation.lastMessageTime)}
                          </span>
                          <div className="flex items-center space-x-1">
                            {conversation.direction === 'out' && (
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            )}
                            {conversation.direction === 'in' && conversation.unreadCount > 0 && (
                              <MessageSquare className="h-3 w-3 text-blue-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No conversations found</h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'Try adjusting your search terms' : 'No conversations match your filters'}
                </p>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Message View */}
        <div className="flex-1 flex flex-col">
          {selectedConversationData ? (
            <>
              {/* Message Header */}
              <div className="border-b p-4 bg-card/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">{selectedConversationData.customerName}</h2>
                    <p className="text-sm text-muted-foreground">{selectedConversationData.phoneNumber}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleManualRefresh}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.direction === 'out' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-lg ${
                          message.direction === 'out'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs opacity-70">
                            {formatMessageTime(message.sentAt)}
                          </span>
                          {message.direction === 'out' && (
                            <div className="flex items-center space-x-1">
                              {message.aiGenerated && (
                                <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                  AI
                                </Badge>
                              )}
                              <CheckCircle2 className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="border-t p-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Type your message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={sendingMessage}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={!messageInput.trim() || sendingMessage}
                  >
                    {sendingMessage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">Select a conversation</h3>
                <p className="text-sm text-muted-foreground">
                  Choose a conversation from the list to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConsolidatedSmartInbox;
