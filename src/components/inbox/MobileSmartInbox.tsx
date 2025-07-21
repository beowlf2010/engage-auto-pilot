
import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, MessageSquare, RefreshCw, Loader2 } from 'lucide-react';
import { useInboxFilters } from '@/hooks/useInboxFilters';
import { useStableRealtimeInbox } from '@/hooks/useStableRealtimeInbox';
import { useInboxOperations } from '@/hooks/inbox/useInboxOperations';
import ConversationItem from '@/components/inbox/ConversationItem';
import ConversationView from '@/components/inbox/ConversationView';
import ErrorBoundary from '@/components/inbox/ErrorBoundary';

interface MobileSmartInboxProps {
  onBack: () => void;
  leadId?: string;
}

const MobileSmartInbox: React.FC<MobileSmartInboxProps> = ({ onBack, leadId }) => {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Use consistent hooks with SmartInbox
  const {
    filters,
    updateFilter,
    clearAllFilters,
    filteredConversations,
    hasActiveFilters
  } = useInboxFilters();

  const {
    conversations,
    messages,
    loading,
    loadMessages,
    sendMessage,
    sendingMessage,
    markAsRead,
    isMarkingAsRead,
    refetchConversations
  } = useStableRealtimeInbox();

  const {
    canReply,
    handleSelectConversation,
    handleSendMessage
  } = useInboxOperations({
    user: { role: profile?.role || 'user', id: profile?.id || '' },
    loadMessages,
    sendMessage,
    sendingMessage,
    setError
  });

  // Handle conversation selection
  const handleConversationSelect = useCallback(async (conversation: any) => {
    try {
      setSelectedConversation(conversation);
      await handleSelectConversation(conversation.leadId);
    } catch (err) {
      console.error('Error selecting conversation:', err);
      setError('Failed to load conversation');
    }
  }, [handleSelectConversation]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (selectedConversation) {
      setSelectedConversation(null);
    } else {
      onBack();
    }
  }, [selectedConversation, onBack]);

  // Handle sending messages
  const handleMessageSend = useCallback(async (message: string) => {
    if (!selectedConversation) return;
    
    try {
      await handleSendMessage(
        selectedConversation.leadId,
        selectedConversation,
        message
      );
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    }
  }, [selectedConversation, handleSendMessage]);

  // Handle marking as read
  const handleMarkAsRead = useCallback(async (leadId: string) => {
    try {
      await markAsRead(leadId);
      refetchConversations();
    } catch (err) {
      console.error('Error marking as read:', err);
      setError('Failed to mark as read');
    }
  }, [markAsRead, refetchConversations]);

  // Apply search to conversations
  const searchedConversations = React.useMemo(() => {
    if (!searchQuery.trim()) return filteredConversations;
    
    return filteredConversations.filter(conv => 
      conv.leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.leadPhone.includes(searchQuery) ||
      conv.vehicleInterest.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [filteredConversations, searchQuery]);

  // Auto-select conversation if leadId provided
  useEffect(() => {
    if (leadId && conversations.length > 0 && !selectedConversation) {
      const conversation = conversations.find(c => c.leadId === leadId);
      if (conversation) {
        handleConversationSelect(conversation);
      }
    }
  }, [leadId, conversations, selectedConversation, handleConversationSelect]);

  // Show conversation view if one is selected
  if (selectedConversation) {
    return (
      <ErrorBoundary>
        <ConversationView
          conversation={selectedConversation}
          messages={messages}
          onBack={handleBack}
          onSendMessage={handleMessageSend}
          sending={sendingMessage}
          onMarkAsRead={() => handleMarkAsRead(selectedConversation.leadId)}
          canReply={canReply(selectedConversation)}
          loading={loading}
          error={error}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col bg-background">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-card">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">Inbox</h1>
            <Badge variant="secondary">
              {searchedConversations.length}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refetchConversations}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b bg-card">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Filter status */}
        {hasActiveFilters && (
          <div className="p-3 bg-blue-50 border-b text-sm">
            <span className="text-blue-800">Filters active</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="ml-2 h-auto p-1 text-blue-700"
            >
              Clear all
            </Button>
          </div>
        )}

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading conversations...</p>
              </div>
            </div>
          ) : searchedConversations.length === 0 ? (
            <div className="flex items-center justify-center h-32 p-8">
              <div className="text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No conversations match your search' : 'No conversations found'}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {searchedConversations.map((conversation) => (
                <ConversationItem
                  key={conversation.leadId}
                  conversation={conversation}
                  onSelect={() => handleConversationSelect(conversation)}
                  isSelected={false}
                />
              ))}
            </div>
          )}
        </div>

        {/* Error display */}
        {error && (
          <div className="p-4 bg-destructive/10 border-t">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="mt-2"
            >
              Dismiss
            </Button>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default MobileSmartInbox;
