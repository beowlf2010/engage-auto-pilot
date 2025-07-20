
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search, MessageCircle, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import ConversationItem from './ConversationItem';
import MessageThread from './MessageThread';
import { useStableRealtimeInbox } from '@/hooks/useStableRealtimeInbox';
import { toast } from '@/hooks/use-toast';
import type { ConversationListItem } from '@/types/conversation';

interface MobileSmartInboxProps {
  onBack: () => void;
  leadId?: string;
}

const MobileSmartInbox: React.FC<MobileSmartInboxProps> = ({ onBack, leadId }) => {
  const [selectedConversation, setSelectedConversation] = useState<ConversationListItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const {
    conversations,
    messages,
    loading: conversationsLoading,
    error,
    sendMessage,
    refetch: refreshData
  } = useStableRealtimeInbox();

  const totalUnread = conversations.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0);
  const messagesLoading = conversationsLoading;

  // Auto-select conversation if leadId is provided in URL
  useEffect(() => {
    if (leadId && conversations.length > 0 && !selectedConversation) {
      const conversation = conversations.find(c => c.leadId === leadId);
      if (conversation) {
        setSelectedConversation(conversation);
      }
    }
  }, [leadId, conversations, selectedConversation]);

  const filteredConversations = conversations.filter(conversation =>
    conversation.leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conversation.vehicleInterest.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleConversationSelect = (conversation: ConversationListItem) => {
    setSelectedConversation(conversation);
    // Update URL to reflect selected conversation
    const url = new URL(window.location.href);
    url.searchParams.set('leadId', conversation.leadId);
    window.history.replaceState({}, '', url.toString());
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
    // Remove leadId from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('leadId');
    window.history.replaceState({}, '', url.toString());
  };

  const handleSendMessage = async (messageContent: string) => {
    if (!selectedConversation) return;
    
    try {
      await sendMessage(selectedConversation.leadId, messageContent);
      // Refresh both messages and conversations to update unread counts
      refreshData();
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRefresh = () => {
    refreshData();
  };

  if (conversationsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading conversations</p>
          <Button onClick={refreshData} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {selectedConversation ? (
        // Message Thread View
        <div className="flex flex-col h-full">
          <div className="flex items-center p-4 bg-white border-b">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToList}
              className="mr-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <h2 className="font-semibold">Back to Conversations</h2>
            </div>
          </div>
          
          <MessageThread
            leadId={selectedConversation.leadId}
            messages={messages}
            conversation={selectedConversation}
            onSendMessage={handleSendMessage}
            canReply={!!selectedConversation.primaryPhone}
            loading={messagesLoading}
            onRefresh={handleRefresh}
          />
        </div>
      ) : (
        // Conversation List View
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-white border-b">
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h2 className="font-semibold">Smart Inbox</h2>
              {totalUnread > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {totalUnread}
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="sm">
              <Filter className="w-4 h-4" />
            </Button>
          </div>

          {/* Search */}
          <div className="p-4 bg-white border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">
                    {searchTerm ? 'No conversations match your search' : 'No conversations yet'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y">
                {filteredConversations.map((conversation) => (
                  <ConversationItem
                    key={conversation.leadId}
                    conversation={conversation}
                    isSelected={selectedConversation?.leadId === conversation.leadId}
                    onSelect={() => handleConversationSelect(conversation)}
                    canReply={!!conversation.primaryPhone}
                    markAsRead={async () => {}}
                    isMarkingAsRead={false}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileSmartInbox;
