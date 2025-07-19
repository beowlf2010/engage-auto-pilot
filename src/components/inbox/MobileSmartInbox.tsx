
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, RefreshCw, MessageSquare, Phone, Clock, CheckCheck, AlertTriangle } from 'lucide-react';
import { useStableRealtimeInbox } from '@/hooks/useStableRealtimeInbox';
import ConversationItem from './ConversationItem';
import MessageThread from './MessageThread';
import type { ConversationListItem } from '@/types/conversation';

interface MobileSmartInboxProps {
  onLeadsRefresh: () => void;
  preselectedLeadId?: string | null;
}

const MobileSmartInbox: React.FC<MobileSmartInboxProps> = ({ 
  onLeadsRefresh, 
  preselectedLeadId 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(preselectedLeadId || null);
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);

  const {
    conversations,
    messages,
    loading,
    error,
    fetchMessages,
    sendMessage,
    refetch,
    isRealtimeConnected,
    connectionState,
    forceRefresh
  } = useStableRealtimeInbox();

  // Debug logging to track data flow
  useEffect(() => {
    console.log('🔍 [MOBILE INBOX] Conversations loaded:', {
      count: conversations.length,
      withUnread: conversations.filter(c => c.unreadCount > 0).length,
      totalUnread: conversations.reduce((sum, c) => sum + c.unreadCount, 0),
      conversations: conversations.map(c => ({
        leadId: c.leadId,
        leadName: c.leadName,
        unreadCount: c.unreadCount,
        lastMessage: c.lastMessage?.substring(0, 50)
      }))
    });
  }, [conversations]);

  // Set preselected lead on mount
  useEffect(() => {
    if (preselectedLeadId && !selectedLeadId) {
      console.log('🎯 [MOBILE INBOX] Setting preselected lead:', preselectedLeadId);
      setSelectedLeadId(preselectedLeadId);
      fetchMessages(preselectedLeadId);
    }
  }, [preselectedLeadId, selectedLeadId, fetchMessages]);

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conversation =>
    conversation.leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conversation.leadPhone.includes(searchQuery) ||
    conversation.vehicleInterest.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conversation.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConversationSelect = async (conversation: ConversationListItem) => {
    console.log('📱 [MOBILE INBOX] Selecting conversation:', conversation.leadId);
    setSelectedLeadId(conversation.leadId);
    try {
      await fetchMessages(conversation.leadId);
    } catch (error) {
      console.error('❌ [MOBILE INBOX] Error loading messages:', error);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!selectedLeadId) return;
    
    try {
      console.log('📤 [MOBILE INBOX] Sending message to:', selectedLeadId);
      await sendMessage(selectedLeadId, message);
    } catch (error) {
      console.error('❌ [MOBILE INBOX] Error sending message:', error);
      throw error;
    }
  };

  const handleMarkAsRead = async (leadId: string) => {
    setMarkingAsRead(leadId);
    try {
      console.log('📖 [MOBILE INBOX] Marking as read:', leadId);
      // The messages are automatically marked as read when loaded
      await fetchMessages(leadId);
      // Force refresh to update unread counts
      setTimeout(() => forceRefresh(), 500);
    } catch (error) {
      console.error('❌ [MOBILE INBOX] Error marking as read:', error);
    } finally {
      setMarkingAsRead(null);
    }
  };

  const handleRefresh = () => {
    console.log('🔄 [MOBILE INBOX] Manual refresh triggered');
    forceRefresh();
    onLeadsRefresh();
  };

  const canReply = (conversation: ConversationListItem) => {
    return !!conversation.leadPhone && conversation.leadPhone !== 'No phone';
  };

  const selectedConversation = conversations.find(c => c.leadId === selectedLeadId);

  if (loading && conversations.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">Loading conversations...</p>
          <p className="text-sm text-gray-500 mt-1">AI-powered inbox</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Conversations</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Smart Inbox</h1>
            <Badge variant={isRealtimeConnected ? "default" : "destructive"} className="text-xs">
              {isRealtimeConnected ? "Live" : "Offline"}
            </Badge>
          </div>
          <Button onClick={handleRefresh} variant="ghost" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mt-3 text-sm text-gray-600">
          <span>{filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''}</span>
          <span>{filteredConversations.reduce((sum, c) => sum + c.unreadCount, 0)} unread</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {selectedConversation ? (
          /* Message Thread View */
          <div className="h-full flex flex-col">
            {/* Thread Header */}
            <div className="border-b bg-gray-50 p-4">
              <div className="flex items-center justify-between">
                <Button 
                  onClick={() => setSelectedLeadId(null)} 
                  variant="ghost" 
                  size="sm"
                  className="mb-2"
                >
                  ← Back to Conversations
                </Button>
              </div>
              <div className="flex items-center space-x-3">
                <div>
                  <h2 className="font-semibold text-gray-900">{selectedConversation.leadName}</h2>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Phone className="h-3 w-3 mr-1" />
                      <span>{selectedConversation.leadPhone}</span>
                    </div>
                    <span>{selectedConversation.vehicleInterest}</span>
                  </div>
                </div>
                {selectedConversation.unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-auto">
                    {selectedConversation.unreadCount} unread
                  </Badge>
                )}
              </div>
            </div>

            {/* Messages */}
            <MessageThread
              leadId={selectedLeadId}
              messages={messages}
              onSendMessage={handleSendMessage}
              canReply={canReply(selectedConversation)}
              loading={loading}
            />
          </div>
        ) : (
          /* Conversations List */
          <div className="h-full overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="h-full flex items-center justify-center p-8">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations found</h3>
                  <p className="text-gray-500">
                    {searchQuery ? 'Try adjusting your search' : 'New conversations will appear here'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {filteredConversations.map((conversation) => (
                  <ConversationItem
                    key={conversation.leadId}
                    conversation={conversation}
                    isSelected={false}
                    onSelect={() => handleConversationSelect(conversation)}
                    canReply={canReply(conversation)}
                    markAsRead={handleMarkAsRead}
                    isMarkingAsRead={markingAsRead === conversation.leadId}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileSmartInbox;
