import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useConversationsList } from '@/hooks/conversation/useConversationsList';
import { useRealtimeInbox } from '@/hooks/useRealtimeInbox';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, RefreshCw, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthProvider";
import ConnectionHealthIndicator from './ConnectionHealthIndicator';

interface MobileSmartInboxProps {
  onLeadsRefresh?: () => void;
  preselectedLeadId?: string;
}

interface ConversationViewProps {
  leadId: string;
  conversation: any;
  messages: any[];
  onSendMessage: (leadId: string, message: string) => Promise<void>;
  onBack: () => void;
  loading: boolean;
}

const MobileSmartInbox = ({ onLeadsRefresh, preselectedLeadId }: MobileSmartInboxProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedLead, setSelectedLead] = useState<string | null>(preselectedLeadId || null);
  const [messageText, setMessageText] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();

  // Use the existing hooks for data management
  const { conversations, conversationsLoading, refetchConversations } = useConversationsList();
  const { 
    messages, 
    fetchMessages, 
    sendMessage, 
    loading: messagesLoading, 
    connectionState,
    forceReconnect,
    getHealthStatus 
  } = useRealtimeInbox();

  // Centralized realtime setup (assuming this is still needed)
  useEffect(() => {
    if (preselectedLeadId) {
      setSelectedLead(preselectedLeadId);
      fetchMessages(preselectedLeadId);
    }
  }, [preselectedLeadId, fetchMessages]);

  // Get health status for connection indicator
  const healthStatus = getHealthStatus ? getHealthStatus() : {
    healthScore: 50,
    shouldUsePolling: false,
    recommendedAction: 'Unknown',
    networkQuality: 'good' as const,
    consecutiveFailures: 0
  };

  const handleSendMessage = async () => {
    if (!selectedLead) return;
    const text = messageText.trim();
    if (!text) return;

    try {
      await sendMessage(selectedLead, text);
      setMessageText('');
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: error.message || "Failed to send message. Please try again.",
      });
    }
  };

  const handleSelectConversation = (leadId: string) => {
    setSelectedLead(leadId);
    setSearchParams({ leadId: leadId });
    fetchMessages(leadId);
  };

  const ConversationItem = ({ conversation, isSelected }: { conversation: any, isSelected: boolean }) => (
    <Button
      variant="ghost"
      className={`flex items-center space-x-3 w-full justify-between p-3 rounded-md ${isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}
      onClick={() => handleSelectConversation(conversation.leadId)}
    >
      <div className="flex items-center space-x-3">
        <Avatar>
          <AvatarImage src={`https://avatar.vercel.sh/${conversation.leadId}.png`} />
          <AvatarFallback>{conversation.leadName?.substring(0, 2) || 'N/A'}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col items-start rtl:items-end space-y-1">
          <p className="text-sm font-medium leading-none">{conversation.leadName || 'Unknown Lead'}</p>
          <p className="text-sm text-muted-foreground">{conversation.lastMessage?.substring(0, 40) || 'No messages yet'}</p>
        </div>
      </div>
      {conversation.unreadCount > 0 && (
        <Badge variant="destructive" className="min-w-[20px] h-5 text-xs">
          {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
        </Badge>
      )}
    </Button>
  );

  const ConversationView: React.FC<ConversationViewProps> = ({
    leadId,
    conversation,
    messages,
    onSendMessage,
    onBack,
    loading
  }) => {
    const [inputMessage, setInputMessage] = useState('');

    const handleSend = async () => {
      if (!leadId) return;
      const text = inputMessage.trim();
      if (!text) return;

      try {
        await onSendMessage(leadId, text);
        setInputMessage('');
      } catch (error: any) {
        console.error("Error sending message:", error);
        toast({
          variant: "destructive",
          title: "Uh oh! Something went wrong.",
          description: error.message || "Failed to send message. Please try again.",
        });
      }
    };

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={onBack}>
              ← Back
            </Button>
            <h2 className="text-lg font-semibold">{conversation?.leadName || 'Conversation'}</h2>
            <div></div> {/* Placeholder for alignment */}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center text-muted-foreground">Loading messages...</div>
          ) : (
            messages?.map((message: any) => (
              <div
                key={message.id}
                className={`mb-2 p-3 rounded-lg ${message.direction === 'out' ? 'bg-blue-100 ml-auto text-right' : 'bg-gray-100 mr-auto'
                  }`}
                style={{ maxWidth: '80%' }}
              >
                <div className="text-sm text-gray-500">{new Date(message.sentAt).toLocaleString()}</div>
                <div>{message.body}</div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex items-center space-x-2">
            <Input
              type="text"
              placeholder="Type your message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSend();
                }
              }}
            />
            <Button onClick={handleSend} disabled={loading}>
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const totalUnreadCount = conversations?.reduce((sum, conv) => sum + conv.unreadCount, 0) || 0;
  const selectedConversation = conversations?.find(conv => conv.leadId === selectedLead);
  
  // Show connection status if there are issues
  const showConnectionIssue = !connectionState.isConnected || connectionState.status !== 'connected';

  // Loading states
  if (conversationsLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // Empty state
  if (!conversations?.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Conversations</h3>
        <p className="text-muted-foreground mb-4">You don't have any conversations yet.</p>
        
        {/* Enhanced connection status display */}
        {showConnectionIssue && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg max-w-sm">
            <div className="flex items-center justify-center mb-2">
              <ConnectionHealthIndicator
                connectionState={connectionState}
                healthStatus={healthStatus}
                onReconnect={forceReconnect}
                onForceSync={() => refetchConversations()}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {healthStatus.recommendedAction}
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

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header with enhanced connection status */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-semibold">Smart Inbox</h1>
            {totalUnreadCount > 0 && (
              <Badge variant="destructive" className="min-w-[20px] h-5 text-xs">
                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <ConnectionHealthIndicator
              connectionState={connectionState}
              healthStatus={healthStatus}
              onReconnect={forceReconnect}
              onForceSync={() => refetchConversations()}
              compact
            />
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

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation List */}
        <div className={`${selectedLead ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r bg-muted/10`}>
          <ScrollArea className="flex-1">
            <div className="p-2">
              {conversations?.map((conversation) => (
                <ConversationItem
                  key={conversation.leadId}
                  conversation={conversation}
                  isSelected={selectedLead === conversation.leadId}
                />
              ))}
            </div>
          </ScrollArea>
          <Separator />
          <div className="p-4">
            <p className="text-xs text-muted-foreground">
              {conversations?.length} Conversations
            </p>
          </div>
        </div>

        {/* Message View */}
        <div className={`${selectedLead ? 'flex' : 'hidden md:flex'} flex-col flex-1`}>
          {selectedLead ? (
            <ConversationView
              leadId={selectedLead}
              conversation={selectedConversation}
              messages={messages}
              onSendMessage={sendMessage}
              onBack={() => setSelectedLead(null)}
              loading={messagesLoading}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 text-center">
              <div>
                <MessageSquare className="h-16 w-16 text-muted-foreground mb-4 mx-auto" />
                <h3 className="text-lg font-semibold mb-2">Select a Conversation</h3>
                <p className="text-muted-foreground mb-4">Choose a conversation from the list to start messaging.</p>
                
                {/* Show connection status if there are issues */}
                {showConnectionIssue && (
                  <div className="mb-4">
                    <ConnectionHealthIndicator
                      connectionState={connectionState}
                      healthStatus={healthStatus}
                      onReconnect={forceReconnect}
                      onForceSync={() => refetchConversations()}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileSmartInbox;
