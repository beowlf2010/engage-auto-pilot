
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, MessageSquare, RefreshCw, Loader2 } from 'lucide-react';
import { useConversationsList } from '@/hooks/conversation/useConversationsList';
import { useMessageFiltering } from '@/components/inbox/useMessageFiltering';
import { useStableRealtimeInbox } from '@/hooks/useStableRealtimeInbox';
import ConversationItem from '@/components/inbox/ConversationItem';
import ConversationView from '@/components/inbox/ConversationView';
import { markMessagesAsRead } from '@/services/conversationsService';

interface MobileSmartInboxProps {
  onBack: () => void;
  leadId?: string;
}

const MobileSmartInbox: React.FC<MobileSmartInboxProps> = ({ onBack, leadId }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);

  // Use stable realtime inbox for real-time updates
  const {
    conversations,
    messages,
    loading,
    error,
    fetchMessages,
    sendMessage,
    refetch,
    isRealtimeConnected
  } = useStableRealtimeInbox();

  // Use conversation filtering
  const {
    conversationFilter,
    setConversationFilter,
    getFilteredConversations,
    getConversationCounts
  } = useMessageFiltering();

  console.log('📱 [MOBILE INBOX] Render state:', {
    conversationsCount: conversations.length,
    loading,
    error,
    selectedConversation: selectedConversation?.leadId,
    realtimeConnected: isRealtimeConnected
  });

  // Filter and search conversations
  const filteredConversations = getFilteredConversations(conversations).filter(conv =>
    conv.leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.leadPhone.includes(searchQuery) ||
    conv.vehicleInterest.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const counts = getConversationCounts(conversations);

  console.log('📊 [MOBILE INBOX] Conversation counts:', counts);
  console.log('📊 [MOBILE INBOX] Filtered conversations:', filteredConversations.length);
  console.log('🔴 [MOBILE INBOX] Conversations with unread:', 
    filteredConversations.filter(c => c.unreadCount > 0).map(c => ({
      leadName: c.leadName,
      unreadCount: c.unreadCount
    }))
  );

  // Auto-select conversation if leadId provided
  useEffect(() => {
    if (leadId && conversations.length > 0 && !selectedConversation) {
      const conversation = conversations.find(c => c.leadId === leadId);
      if (conversation) {
        console.log('🎯 [MOBILE INBOX] Auto-selecting conversation for leadId:', leadId);
        handleConversationSelect(conversation);
      }
    }
  }, [leadId, conversations, selectedConversation]);

  const handleConversationSelect = useCallback(async (conversation: any) => {
    console.log('📱 [MOBILE INBOX] Selecting conversation:', conversation.leadName);
    setSelectedConversation(conversation);
    
    try {
      await fetchMessages(conversation.leadId);
    } catch (error) {
      console.error('❌ [MOBILE INBOX] Error fetching messages:', error);
    }
  }, [fetchMessages]);

  const handleSendMessage = useCallback(async (messageText: string) => {
    if (!selectedConversation) return;
    
    try {
      console.log('📤 [MOBILE INBOX] Sending message...');
      await sendMessage(selectedConversation.leadId, messageText);
      console.log('✅ [MOBILE INBOX] Message sent successfully');
    } catch (error) {
      console.error('❌ [MOBILE INBOX] Error sending message:', error);
    }
  }, [selectedConversation, sendMessage]);

  const handleMarkAsRead = useCallback(async (leadId: string) => {
    setIsMarkingAsRead(true);
    try {
      console.log('📖 [MOBILE INBOX] Marking messages as read for lead:', leadId);
      await markMessagesAsRead(leadId);
      
      // Refresh conversations to update unread counts
      await refetch();
      
      console.log('✅ [MOBILE INBOX] Messages marked as read');
    } catch (error) {
      console.error('❌ [MOBILE INBOX] Error marking messages as read:', error);
    } finally {
      setIsMarkingAsRead(false);
    }
  }, [refetch]);

  const handleRefresh = useCallback(async () => {
    console.log('🔄 [MOBILE INBOX] Manual refresh triggered');
    await refetch();
  }, [refetch]);

  const handleBack = useCallback(() => {
    if (selectedConversation) {
      setSelectedConversation(null);
    } else {
      onBack();
    }
  }, [selectedConversation, onBack]);

  // Show conversation view if one is selected
  if (selectedConversation) {
    return (
      <ConversationView
        conversation={selectedConversation}
        messages={messages}
        onBack={handleBack}
        onSendMessage={handleSendMessage}
        sending={isMarkingAsRead}
        onMarkAsRead={() => handleMarkAsRead(selectedConversation.leadId)}
        canReply={true}
        loading={loading}
        error={error}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Smart Inbox</h1>
            <div className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="p-4 space-y-3 border-b bg-card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-2 overflow-x-auto">
          {[
            { key: 'all', label: 'All', count: counts.totalCount },
            { key: 'unread', label: 'Unread', count: counts.unreadCount },
            { key: 'inbound', label: 'Inbound', count: counts.inboundCount },
            { key: 'sent', label: 'Sent', count: counts.sentCount }
          ].map(({ key, label, count }) => (
            <Button
              key={key}
              variant={conversationFilter === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setConversationFilter(key as any)}
              className="flex items-center space-x-1 whitespace-nowrap"
            >
              <span>{label}</span>
              <Badge variant="secondary" className="ml-1">
                {count}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading && conversations.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading conversations...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <p className="text-sm text-destructive">Error loading conversations</p>
              <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2">
                Try Again
              </Button>
            </div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No conversations match your search' : 'No conversations found'}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.leadId}
                conversation={conversation}
                isSelected={selectedConversation?.leadId === conversation.leadId}
                onSelect={() => handleConversationSelect(conversation)}
                canReply={true}
                markAsRead={handleMarkAsRead}
                isMarkingAsRead={isMarkingAsRead}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileSmartInbox;
