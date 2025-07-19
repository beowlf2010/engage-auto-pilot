
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useConversationsList } from '@/hooks/conversation/useConversationsList';
import { useStableRealtimeInbox } from '@/hooks/useStableRealtimeInbox';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, RefreshCw, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import StableConnectionStatus from './StableConnectionStatus';
import OptimizedConversationItem from './OptimizedConversationItem';
import MessageBubble from './MessageBubble';

const MobileSmartInbox = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Stable state management
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(
    searchParams.get('leadId')
  );
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Stable hooks
  const { conversations, conversationsLoading } = useConversationsList();
  const {
    messages,
    loading: messagesLoading,
    fetchMessages,
    sendMessage,
    connectionState,
    forceReconnect,
    refetch
  } = useStableRealtimeInbox();

  // Memoized filtered conversations to prevent unnecessary re-renders
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    
    const query = searchQuery.toLowerCase();
    return conversations.filter(conv => 
      conv.leadName.toLowerCase().includes(query) ||
      conv.leadPhone.includes(query) ||
      conv.vehicleInterest.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  // Memoized selected conversation
  const selectedConversation = useMemo(() => 
    conversations.find(conv => conv.leadId === selectedLeadId),
    [conversations, selectedLeadId]
  );

  // Stable message loading
  const loadMessagesForLead = useCallback(async (leadId: string) => {
    if (!leadId) return;
    
    try {
      await fetchMessages(leadId);
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages. Please try again.",
        variant: "destructive",
      });
    }
  }, [fetchMessages, toast]);

  // Handle lead selection
  const handleSelectConversation = useCallback(async (conversation: any) => {
    if (conversation.leadId === selectedLeadId) return;
    
    setSelectedLeadId(conversation.leadId);
    navigate(`/smart-inbox?leadId=${conversation.leadId}`, { replace: true });
    
    await loadMessagesForLead(conversation.leadId);
  }, [selectedLeadId, navigate, loadMessagesForLead]);

  // Handle sending messages
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedLeadId || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(selectedLeadId, newMessage.trim());
      setNewMessage('');
      
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  }, [newMessage, selectedLeadId, isSending, sendMessage, toast]);

  // Load messages when leadId changes from URL
  useEffect(() => {
    const leadIdFromUrl = searchParams.get('leadId');
    if (leadIdFromUrl && leadIdFromUrl !== selectedLeadId) {
      setSelectedLeadId(leadIdFromUrl);
      loadMessagesForLead(leadIdFromUrl);
    }
  }, [searchParams, selectedLeadId, loadMessagesForLead]);

  // Render conversations list
  const renderConversationsList = () => (
    <div className="h-full flex flex-col">
      {/* Header with search and connection status */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Conversations</h2>
          <StableConnectionStatus
            connectionState={connectionState}
            onReconnect={forceReconnect}
            onRefresh={refetch}
          />
        </div>
        
        <Input
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto">
        {conversationsLoading ? (
          <div className="p-4 text-center">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-500">Loading conversations...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchQuery ? 'No conversations match your search' : 'No conversations found'}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {filteredConversations.map((conversation) => (
              <OptimizedConversationItem
                key={conversation.leadId}
                conversation={conversation}
                isSelected={selectedLeadId === conversation.leadId}
                onSelect={handleSelectConversation}
                onMarkAsRead={() => {}} // Implement if needed
                isMarkingAsRead={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Render chat view
  const renderChatView = () => {
    if (!selectedConversation) {
      return (
        <div className="h-full flex items-center justify-center p-8">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Select a conversation
            </h3>
            <p className="text-gray-500">
              Choose a conversation from the list to start messaging
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col">
        {/* Chat header */}
        <div className="p-4 border-b bg-white">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedLeadId(null);
                navigate('/smart-inbox', { replace: true });
              }}
              className="md:hidden"
            >
              ← Back
            </Button>
            <div className="flex-1">
              <h3 className="font-semibold">{selectedConversation.leadName}</h3>
              <p className="text-sm text-gray-600">{selectedConversation.leadPhone}</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messagesLoading ? (
            <div className="text-center">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-500">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
        </div>

        {/* Message input */}
        <div className="p-4 border-t bg-white">
          <div className="flex space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isSending}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isSending}
              size="icon"
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

  return (
    <div className="h-screen flex">
      {/* Mobile: Show either list or chat */}
      <div className="flex-1 md:hidden">
        {selectedLeadId ? renderChatView() : renderConversationsList()}
      </div>

      {/* Desktop: Show both side by side */}
      <div className="hidden md:flex w-full">
        <div className="w-1/3 border-r">
          {renderConversationsList()}
        </div>
        <div className="flex-1">
          {renderChatView()}
        </div>
      </div>
    </div>
  );
};

export default MobileSmartInbox;
