
import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, MessageSquare, RefreshCw, Loader2 } from 'lucide-react';
import { useInboxFilters } from '@/hooks/useInboxFilters';
import { useStableRealtimeInbox } from '@/hooks/useStableRealtimeInbox';
import { useInboxOperations } from '@/hooks/inbox/useInboxOperations';
import InboxConversationsList from '@/components/inbox/InboxConversationsList';
import ConversationView from '@/components/inbox/ConversationView';
import SmartFilters from '@/components/inbox/SmartFilters';
import QuickFilters from '@/components/inbox/QuickFilters';
import ErrorBoundary from '@/components/inbox/ErrorBoundary';

interface SmartInboxProps {
  onBack: () => void;
  leadId?: string;
}

const SmartInbox: React.FC<SmartInboxProps> = ({ onBack, leadId }) => {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [activeQuickFilters, setActiveQuickFilters] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Use the inbox filters hook
  const {
    filters,
    updateFilter,
    clearAllFilters,
    filteredConversations,
    hasActiveFilters,
    filterSummary
  } = useInboxFilters();

  // Use stable realtime inbox for conversations and messaging
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

  // Use inbox operations for conversation handling
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

  // Handle filters change - convert from partial update to individual updates
  const handleFiltersChange = useCallback((partialFilters: any) => {
    Object.entries(partialFilters).forEach(([key, value]) => {
      updateFilter(key as any, value);
    });
  }, [updateFilter]);

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
      // Refresh conversations to update unread counts
      refetchConversations();
    } catch (err) {
      console.error('Error marking as read:', err);
      setError('Failed to mark as read');
    }
  }, [markAsRead, refetchConversations]);

  // Quick filter toggle
  const handleQuickFilterToggle = useCallback((filterId: string) => {
    const newFilters = new Set(activeQuickFilters);
    if (newFilters.has(filterId)) {
      newFilters.delete(filterId);
    } else {
      newFilters.add(filterId);
    }
    setActiveQuickFilters(newFilters);
  }, [activeQuickFilters]);

  // Apply search and quick filters to conversations
  const processedConversations = React.useMemo(() => {
    let filtered = filteredConversations;

    // Apply search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(conv => 
        conv.leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.leadPhone.includes(searchQuery) ||
        conv.vehicleInterest.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply quick filters
    if (activeQuickFilters.has('unread')) {
      filtered = filtered.filter(conv => conv.unreadCount > 0);
    }
    if (activeQuickFilters.has('urgent')) {
      filtered = filtered.filter(conv => conv.unreadCount > 5);
    }

    return filtered;
  }, [filteredConversations, searchQuery, activeQuickFilters]);

  // Auto-select conversation if leadId provided
  useEffect(() => {
    if (leadId && conversations.length > 0 && !selectedConversation) {
      const conversation = conversations.find(c => c.leadId === leadId);
      if (conversation) {
        handleConversationSelect(conversation);
      }
    }
  }, [leadId, conversations, selectedConversation, handleConversationSelect]);

  // Show conversation view if selected
  if (selectedConversation) {
    return (
      <ErrorBoundary>
        <ConversationView
          conversation={selectedConversation}
          messages={messages}
          onBack={() => setSelectedConversation(null)}
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
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-semibold">Smart Inbox</h1>
            <Badge variant="secondary">
              {processedConversations.length} conversations
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
            Refresh
          </Button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar with filters and conversations */}
          <div className="w-96 flex flex-col border-r bg-card">
            {/* Search */}
            <div className="p-4 border-b">
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

            {/* Quick Filters */}
            <div className="p-4 border-b">
              <QuickFilters
                activeFilters={activeQuickFilters}
                onFilterToggle={handleQuickFilterToggle}
                unreadCount={conversations.filter(c => c.unreadCount > 0).length}
                urgentCount={conversations.filter(c => c.unreadCount > 5).length}
              />
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-hidden">
              <InboxConversationsList
                conversations={processedConversations}
                selectedConversationId={selectedConversation?.leadId || null}
                onConversationSelect={handleConversationSelect}
                loading={loading}
                searchQuery={searchQuery}
                onMarkAsRead={handleMarkAsRead}
                isMarkingAsRead={isMarkingAsRead}
              />
            </div>
          </div>

          {/* Main content area with advanced filters */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Smart Filters */}
            <div className="p-4 border-b bg-muted/30 max-h-96 overflow-y-auto">
              <SmartFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                conversations={conversations}
                filteredConversations={filteredConversations}
                hasActiveFilters={hasActiveFilters}
                filterSummary={filterSummary}
                onClearFilters={clearAllFilters}
                userRole={profile?.role}
              />
            </div>

            {/* Empty state */}
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Select a conversation to start
                </h3>
                <p className="text-muted-foreground">
                  Choose a conversation from the list to view messages and send replies
                </p>
                {error && (
                  <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md">
                    {error}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default SmartInbox;
