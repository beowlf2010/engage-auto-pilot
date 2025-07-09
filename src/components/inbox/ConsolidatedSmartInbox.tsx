import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  MessageSquare, 
  Search, 
  Phone, 
  Mail, 
  User, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Send,
  Wifi,
  WifiOff,
  Circle
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useRealDataInbox } from '@/hooks/useRealDataInbox';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import type { ConversationListItem } from '@/hooks/conversation/conversationTypes';
import type { MessageData } from '@/types/conversation';

interface ConsolidatedSmartInboxProps {
  onLeadsRefresh: () => void;
  preselectedLeadId?: string | null;
}

const ConsolidatedSmartInbox: React.FC<ConsolidatedSmartInboxProps> = ({
  onLeadsRefresh,
  preselectedLeadId
}) => {
  const { profile } = useAuth();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(preselectedLeadId || null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    hasUnread: false,
    aiOptIn: null as boolean | null
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use real data inbox hook
  const {
    conversations,
    loading: conversationsLoading,
    error: conversationsError,
    refresh: refreshConversations,
    markAsRead,
    sendMessage: sendMessageToLead,
    setSearchQuery: setInboxSearchQuery,
    setFilters: setInboxFilters,
    totalConversations,
    unreadCount
  } = useRealDataInbox();

  // Set up realtime subscriptions
  const handleMessageUpdate = useCallback((leadId: string) => {
    console.log('📨 Message update for lead:', leadId);
    refreshConversations();
    
    // If this is the selected lead, refresh messages
    if (selectedLeadId === leadId) {
      loadMessagesForLead(leadId);
    }
  }, [selectedLeadId, refreshConversations]);

  const handleConversationUpdate = useCallback(() => {
    console.log('📨 Conversation update detected');
    refreshConversations();
  }, [refreshConversations]);

  useRealtimeMessages({
    onMessageUpdate: handleMessageUpdate,
    onConversationUpdate: handleConversationUpdate
  });

  // Load messages for a specific lead
  const loadMessagesForLead = useCallback(async (leadId: string) => {
    if (!leadId) return;

    setLoadingMessages(true);
    try {
      console.log('📨 Loading messages for lead:', leadId);
      
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: true });

      if (error) {
        console.error('❌ Error loading messages:', error);
        throw error;
      }

      const formattedMessages: MessageData[] = data?.map(msg => ({
        id: msg.id,
        leadId: msg.lead_id,
        direction: msg.direction as 'in' | 'out',
        body: msg.body,
        sentAt: msg.sent_at,
        readAt: msg.read_at,
        aiGenerated: msg.ai_generated || false,
        smsStatus: msg.sms_status || 'sent',
        smsError: msg.sms_error
      })) || [];

      setMessages(formattedMessages);
      
      // Mark messages as read
      await markAsRead(leadId);
      
      console.log(`✅ Loaded ${formattedMessages.length} messages for lead ${leadId}`);
    } catch (error) {
      console.error('❌ Error loading messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  }, [markAsRead]);

  // Handle lead selection
  const handleLeadSelect = useCallback((leadId: string) => {
    console.log('👤 Selecting lead:', leadId);
    setSelectedLeadId(leadId);
    loadMessagesForLead(leadId);
  }, [loadMessagesForLead]);

  // Handle sending messages
  const handleSendMessage = useCallback(async () => {
    if (!selectedLeadId || !newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      console.log('📤 Sending message to lead:', selectedLeadId);
      
      await sendMessageToLead(selectedLeadId, newMessage.trim());
      setNewMessage('');
      
      // Refresh messages after sending
      await loadMessagesForLead(selectedLeadId);
      
      console.log('✅ Message sent successfully');
    } catch (error) {
      console.error('❌ Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  }, [selectedLeadId, newMessage, sendingMessage, sendMessageToLead, loadMessagesForLead]);

  // Handle search and filters
  useEffect(() => {
    setInboxSearchQuery(searchQuery);
  }, [searchQuery, setInboxSearchQuery]);

  useEffect(() => {
    setInboxFilters(filters);
  }, [filters, setInboxFilters]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle preselected lead
  useEffect(() => {
    if (preselectedLeadId && preselectedLeadId !== selectedLeadId) {
      handleLeadSelect(preselectedLeadId);
    }
  }, [preselectedLeadId, selectedLeadId, handleLeadSelect]);

  // Filter conversations based on search and filters
  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      const matchesSearch = !searchQuery || 
        conv.leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesUnread = !filters.hasUnread || conv.unreadCount > 0;
      const matchesAiOptIn = filters.aiOptIn === null || conv.aiOptIn === filters.aiOptIn;
      
      return matchesSearch && matchesUnread && matchesAiOptIn;
    });
  }, [conversations, searchQuery, filters]);

  // Get selected conversation details
  const selectedConversation = useMemo(() => {
    return conversations.find(conv => conv.leadId === selectedLeadId);
  }, [conversations, selectedLeadId]);

  const formatMessageTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'hot': return 'bg-red-100 text-red-800';
      case 'warm': return 'bg-orange-100 text-orange-800';
      case 'cold': return 'bg-blue-100 text-blue-800';
      case 'qualified': return 'bg-green-100 text-green-800';
      case 'unqualified': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (conversationsError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading conversations: {conversationsError}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-background">
      {/* Conversations List */}
      <div className="w-1/3 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Conversations</h2>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {totalConversations} total
              </Badge>
              {unreadCount > 0 && (
                <Badge variant="destructive">
                  {unreadCount} unread
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={refreshConversations}
                disabled={conversationsLoading}
              >
                <RefreshCw className={`h-4 w-4 ${conversationsLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={filters.hasUnread ? "default" : "outline"}
              size="sm"
              onClick={() => setFilters(prev => ({ ...prev, hasUnread: !prev.hasUnread }))}
            >
              <Circle className="h-3 w-3 mr-1" />
              Unread
            </Button>
            <Button
              variant={filters.aiOptIn === true ? "default" : "outline"}
              size="sm"
              onClick={() => setFilters(prev => ({ 
                ...prev, 
                aiOptIn: prev.aiOptIn === true ? null : true 
              }))}
            >
              AI Enabled
            </Button>
          </div>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          {conversationsLoading ? (
            <div className="p-4 text-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading conversations...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No conversations found</p>
            </div>
          ) : (
            <div className="p-2">
              {filteredConversations.map((conversation) => (
                <Card
                  key={conversation.leadId}
                  className={`mb-2 cursor-pointer transition-colors hover:bg-accent ${
                    selectedLeadId === conversation.leadId ? 'bg-accent border-primary' : ''
                  }`}
                  onClick={() => handleLeadSelect(conversation.leadId)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {conversation.leadName.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium text-sm">{conversation.leadName}</h4>
                          {conversation.vehicleInterest && (
                            <p className="text-xs text-muted-foreground">{conversation.vehicleInterest}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {conversation.unreadCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                        <Badge className={`text-xs ${getStatusColor(conversation.status)}`}>
                          {conversation.status}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 mb-2">
                      {conversation.lastMessageDirection === 'in' ? (
                        <MessageSquare className="h-3 w-3 text-blue-500" />
                      ) : (
                        <Send className="h-3 w-3 text-green-500" />
                      )}
                      <p className="text-xs text-muted-foreground truncate flex-1">
                        {conversation.lastMessage}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatMessageTime(conversation.lastMessageTime)}</span>
                      <div className="flex items-center gap-1">
                        {conversation.aiOptIn && (
                          <Badge variant="outline" className="text-xs">AI</Badge>
                        )}
                        <Clock className="h-3 w-3" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Messages Panel */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {selectedConversation.leadName.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{selectedConversation.leadName}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {selectedConversation.vehicleInterest && (
                        <span>{selectedConversation.vehicleInterest}</span>
                      )}
                      <Badge className={`text-xs ${getStatusColor(selectedConversation.status)}`}>
                        {selectedConversation.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {selectedConversation.aiOptIn && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="outline" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            AI Enabled
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>AI responses are enabled for this lead</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <Button variant="outline" size="sm">
                    <Phone className="h-4 w-4 mr-1" />
                    Call
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {loadingMessages ? (
                <div className="text-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No messages yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
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
                          <span>{formatMessageTime(message.sentAt)}</span>
                          {message.aiGenerated && (
                            <Badge variant="outline" className="text-xs ml-2">
                              AI
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="min-h-[60px] resize-none"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  className="self-end"
                >
                  {sendingMessage ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
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
              <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
              <p className="text-muted-foreground">
                Choose a conversation from the list to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsolidatedSmartInbox;
