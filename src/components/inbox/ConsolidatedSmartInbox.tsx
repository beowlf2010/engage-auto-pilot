
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarContent, AvatarFallback } from '@/components/ui/avatar';
import { 
  MessageSquare, 
  Search, 
  RefreshCw, 
  Phone, 
  Car, 
  Clock,
  Send,
  AlertCircle,
  Wifi,
  WifiOff,
  CheckCircle2,
  XCircle,
  RotateCcw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCentralizedRealtime } from '@/hooks/useCentralizedRealtime';
import { useConversationData } from '@/hooks/useConversationData';
import { useConversationsList } from '@/hooks/conversation/useConversationsList';
import { formatDistanceToNow } from 'date-fns';
import type { ConversationListItem, MessageData } from '@/types/conversation';

interface ConnectionStatus {
  isConnected: boolean;
  lastConnected: Date | null;
  reconnectAttempts: number;
}

interface ConnectionStatusIndicatorProps {
  status: ConnectionStatus;
  onReconnect: () => void;
}

const ConnectionStatusIndicator = ({ status, onReconnect }: ConnectionStatusIndicatorProps) => {
  const getStatusColor = () => {
    if (status.isConnected) return 'text-green-500';
    if (status.reconnectAttempts > 0) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStatusIcon = () => {
    if (status.isConnected) return <Wifi className="h-4 w-4" />;
    if (status.reconnectAttempts > 0) return <RotateCcw className="h-4 w-4 animate-spin" />;
    return <WifiOff className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (status.isConnected) return 'Connected';
    if (status.reconnectAttempts > 0) return `Reconnecting... (${status.reconnectAttempts})`;
    return 'Disconnected';
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`flex items-center gap-1 ${getStatusColor()}`}>
        {getStatusIcon()}
        <span>{getStatusText()}</span>
      </div>
      {!status.isConnected && (
        <Button
          variant="outline"
          size="sm"
          onClick={onReconnect}
          className="h-6 px-2 text-xs"
        >
          Reconnect
        </Button>
      )}
    </div>
  );
};

export const ConsolidatedSmartInbox = () => {
  const [selectedConversation, setSelectedConversation] = useState<ConversationListItem | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    lastConnected: null,
    reconnectAttempts: 0
  });
  
  const { toast } = useToast();
  
  // Use centralized real-time system
  const { isConnected, forceRefresh, reconnect } = useCentralizedRealtime({
    onConversationUpdate: () => {
      console.log('🔄 [CONSOLIDATED INBOX] Conversation update received');
      refetchConversations();
    },
    onMessageUpdate: (leadId: string) => {
      console.log('💬 [CONSOLIDATED INBOX] Message update for lead:', leadId);
      if (selectedConversation?.leadId === leadId) {
        loadMessages(leadId);
      }
      refetchConversations();
    },
    onUnreadCountUpdate: () => {
      console.log('📬 [CONSOLIDATED INBOX] Unread count update');
      refetchConversations();
    }
  });

  // Get conversations and messages
  const { conversations, conversationsLoading, refetchConversations } = useConversationsList();
  const { messages, messagesLoading, loadMessages, sendMessage } = useConversationData();

  // Update connection status based on real-time connection
  useEffect(() => {
    setConnectionStatus(prev => ({
      ...prev,
      isConnected,
      lastConnected: isConnected ? new Date() : prev.lastConnected,
      reconnectAttempts: isConnected ? 0 : prev.reconnectAttempts
    }));
  }, [isConnected]);

  // Fallback polling when real-time is disconnected
  useEffect(() => {
    let pollingInterval: NodeJS.Timeout;

    if (!isConnected && !isPolling) {
      console.log('📡 [CONSOLIDATED INBOX] Starting fallback polling');
      setIsPolling(true);
      
      pollingInterval = setInterval(() => {
        console.log('🔄 [CONSOLIDATED INBOX] Polling for updates...');
        refetchConversations();
        if (selectedConversation) {
          loadMessages(selectedConversation.leadId);
        }
      }, 15000); // Poll every 15 seconds
    } else if (isConnected && isPolling) {
      console.log('📡 [CONSOLIDATED INBOX] Stopping fallback polling - real-time connected');
      setIsPolling(false);
    }

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [isConnected, isPolling, refetchConversations, loadMessages, selectedConversation]);

  // Filter conversations based on search
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    
    const query = searchQuery.toLowerCase();
    return conversations.filter(conv =>
      conv.leadName.toLowerCase().includes(query) ||
      conv.vehicleInterest.toLowerCase().includes(query) ||
      conv.lastMessage.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  // Handle conversation selection
  const handleConversationSelect = useCallback(async (conversation: ConversationListItem) => {
    console.log('👆 [CONSOLIDATED INBOX] Selecting conversation:', conversation.leadId);
    setSelectedConversation(conversation);
    await loadMessages(conversation.leadId);
  }, [loadMessages]);

  // Handle sending messages
  const handleSendMessage = useCallback(async () => {
    if (!selectedConversation || !messageInput.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      await sendMessage(selectedConversation.leadId, messageInput.trim());
      setMessageInput('');
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully."
      });
    } catch (error) {
      console.error('❌ [CONSOLIDATED INBOX] Send message error:', error);
      toast({
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive"
      });
    } finally {
      setSendingMessage(false);
    }
  }, [selectedConversation, messageInput, sendingMessage, sendMessage, toast]);

  // Handle manual refresh with connection retry
  const handleRefresh = useCallback(async () => {
    console.log('🔄 [CONSOLIDATED INBOX] Manual refresh triggered');
    
    if (!isConnected) {
      setConnectionStatus(prev => ({
        ...prev,
        reconnectAttempts: prev.reconnectAttempts + 1
      }));
      reconnect();
    }
    
    await forceRefresh();
    await refetchConversations();
    
    if (selectedConversation) {
      await loadMessages(selectedConversation.leadId);
    }
  }, [isConnected, reconnect, forceRefresh, refetchConversations, selectedConversation, loadMessages]);

  // Connection status for the indicator
  const indicatorConnectionStatus = useMemo(() => ({
    isConnected,
    lastConnected: connectionStatus.lastConnected,
    reconnectAttempts: connectionStatus.reconnectAttempts
  }), [isConnected, connectionStatus.lastConnected, connectionStatus.reconnectAttempts]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Smart Inbox</h1>
            <Badge variant="secondary" className="ml-2">
              {filteredConversations.length} conversations
            </Badge>
          </div>
          
          <div className="flex items-center gap-4">
            <ConnectionStatusIndicator 
              status={indicatorConnectionStatus}
              onReconnect={reconnect}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={conversationsLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${conversationsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
        
        {/* Search */}
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Fallback polling indicator */}
        {isPolling && (
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Real-time connection lost. Using backup sync every 15 seconds.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Conversations List */}
        <div className="w-1/3 border-r bg-card">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {conversationsLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">Loading conversations...</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No conversations match your search' : 'No conversations yet'}
                  </p>
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  <Card
                    key={conversation.leadId}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedConversation?.leadId === conversation.leadId ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleConversationSelect(conversation)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {conversation.leadName.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-medium">{conversation.leadName}</h3>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {conversation.leadPhone || conversation.primaryPhone}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1">
                          {conversation.unreadCount > 0 && (
                            <Badge variant="destructive" className="h-5 min-w-5 text-xs">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                          <div className="flex items-center gap-1">
                            {conversation.lastMessageDirection === 'in' && (
                              <Badge variant="secondary" className="h-4 w-4 p-0 flex items-center justify-center">
                                ↓
                              </Badge>
                            )}
                            {conversation.lastMessageDirection === 'out' && (
                              <Badge variant="outline" className="h-4 w-4 p-0 flex items-center justify-center">
                                ↑
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Car className="h-3 w-3" />
                          {conversation.vehicleInterest}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {conversation.lastMessage}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(conversation.lastMessageDate, { addSuffix: true })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Messages Header */}
              <div className="flex-shrink-0 border-b bg-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">{selectedConversation.leadName}</h2>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {selectedConversation.leadPhone || selectedConversation.primaryPhone}
                      </div>
                      <div className="flex items-center gap-1">
                        <Car className="h-3 w-3" />
                        {selectedConversation.vehicleInterest}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline">{selectedConversation.status}</Badge>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 flex flex-col min-h-0">
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    {messagesLoading ? (
                      <div className="text-center py-8">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                        <p className="text-muted-foreground">Loading messages...</p>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-muted-foreground">No messages yet</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.direction === 'out' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              message.direction === 'out'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm">{message.body}</p>
                            <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                              <span>
                                {formatDistanceToNow(new Date(message.sentAt), { addSuffix: true })}
                              </span>
                              {message.direction === 'out' && (
                                <span className="flex items-center gap-1">
                                  {message.smsStatus === 'delivered' && <CheckCircle2 className="h-3 w-3" />}
                                  {message.smsStatus === 'failed' && <XCircle className="h-3 w-3" />}
                                  {message.smsStatus}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="flex-shrink-0 border-t bg-card p-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => {
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
                      className="flex items-center gap-2"
                    >
                      {sendingMessage ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-medium mb-2">Select a Conversation</h3>
                <p className="text-muted-foreground">
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
