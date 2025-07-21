
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useConversationOperations } from '@/hooks/useConversationOperations';
import { useInboxOperations } from '@/hooks/inbox/useInboxOperations';
import { useInboxFilters } from '@/hooks/inbox/useInboxFilters';
import { useMarkAsRead } from '@/hooks/useMarkAsRead';
import InboxConversationsList from './InboxConversationsList';
import ConversationView from './ConversationView';
import InboxFilters from './InboxFilters';
import InboxStatusDisplay from './InboxStatusDisplay';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { toast } from '@/hooks/use-toast';
import type { ConversationListItem } from '@/types/conversation';

interface MobileSmartInboxProps {
  onBack?: () => void;
  leadId?: string;
}

const MobileSmartInbox: React.FC<MobileSmartInboxProps> = ({ onBack, leadId }) => {
  const { profile } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<ConversationListItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Use the working conversation operations hook
  const {
    conversations,
    messages,
    loading,
    error,
    loadConversations,
    loadMessages,
    sendMessage,
    manualRefresh
  } = useConversationOperations();

  // Inbox operations for permissions and message handling
  const {
    canReply,
    handleSelectConversation,
    handleSendMessage
  } = useInboxOperations({
    user: profile || { role: 'user', id: '' },
    loadMessages,
    sendMessage,
    sendingMessage: false,
    setError: () => {}
  });

  // Filtering functionality
  const {
    filters,
    filteredConversations,
    updateFilters,
    clearFilters,
    applyFilters
  } = useInboxFilters();

  // Mark as read functionality
  const { markAsRead, isMarkingAsRead } = useMarkAsRead();

  // Load conversations on mount
  useEffect(() => {
    console.log('📱 [MOBILE SMART INBOX] Loading conversations on mount');
    loadConversations();
  }, [loadConversations]);

  // Auto-select conversation if leadId provided
  useEffect(() => {
    if (leadId && conversations.length > 0 && !selectedConversation) {
      const conversation = conversations.find(c => c.leadId === leadId);
      if (conversation) {
        console.log('📱 [MOBILE SMART INBOX] Auto-selecting conversation for lead:', leadId);
        setSelectedConversation(conversation);
        handleSelectConversation(leadId);
      }
    }
  }, [leadId, conversations, selectedConversation, handleSelectConversation]);

  // Apply filters to conversations
  const displayConversations = applyFilters(conversations, filters, searchQuery);

  const handleConversationSelect = useCallback(async (conversation: ConversationListItem) => {
    console.log('📱 [MOBILE SMART INBOX] Selecting conversation:', conversation.leadId);
    setSelectedConversation(conversation);
    try {
      await handleSelectConversation(conversation.leadId);
    } catch (error) {
      console.error('Error selecting conversation:', error);
      toast({
        title: "Error",
        description: "Failed to load conversation messages",
        variant: "destructive"
      });
    }
  }, [handleSelectConversation]);

  const handleSendMessageWrapper = useCallback(async (message: string) => {
    if (!selectedConversation) return;
    
    try {
      await handleSendMessage(
        selectedConversation.leadId,
        selectedConversation,
        message
      );
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, [selectedConversation, handleSendMessage]);

  const handleMarkAsReadWrapper = useCallback(async () => {
    if (!selectedConversation) return;
    
    try {
      await markAsRead(selectedConversation.leadId);
      // Refresh conversations to update unread counts
      await manualRefresh();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, [selectedConversation, markAsRead, manualRefresh]);

  const handleRetry = useCallback(() => {
    console.log('📱 [MOBILE SMART INBOX] Retrying data load');
    manualRefresh();
  }, [manualRefresh]);

  // Show status display for loading, error, or empty states
  if (loading || error || conversations.length === 0) {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b bg-card">
          <div className="flex items-center gap-2">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <h1 className="text-lg font-semibold">Inbox</h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <InboxStatusDisplay
          loading={loading}
          error={error}
          conversationsCount={conversations.length}
          onRetry={handleRetry}
        />
      </div>
    );
  }

  // Show conversation view if one is selected
  if (selectedConversation) {
    return (
      <ConversationView
        conversation={selectedConversation}
        messages={messages.map(msg => ({
          id: msg.id,
          body: msg.body,
          direction: msg.direction,
          sent_at: msg.sentAt,
          read_at: undefined,
          ai_generated: msg.aiGenerated
        }))}
        onBack={() => setSelectedConversation(null)}
        onSendMessage={handleSendMessageWrapper}
        sending={false}
        onMarkAsRead={handleMarkAsReadWrapper}
        canReply={canReply(selectedConversation)}
        loading={loading}
        error={error}
      />
    );
  }

  // Show main mobile inbox view
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Mobile Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <h1 className="text-lg font-semibold">Inbox</h1>
          <span className="text-xs text-muted-foreground">
            ({displayConversations.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Sheet open={showFilters} onOpenChange={setShowFilters}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <InboxFilters
                  filters={filters}
                  onFiltersChange={updateFilters}
                  onClearFilters={clearFilters}
                  conversationCount={displayConversations.length}
                />
              </div>
            </SheetContent>
          </Sheet>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mobile Search */}
      <div className="p-4 border-b bg-card">
        <Input
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Mobile Conversations List */}
      <div className="flex-1 overflow-hidden">
        <InboxConversationsList
          conversations={displayConversations}
          selectedConversationId={selectedConversation?.leadId || null}
          onConversationSelect={handleConversationSelect}
          loading={loading}
          searchQuery={searchQuery}
          onMarkAsRead={markAsRead}
          isMarkingAsRead={isMarkingAsRead}
        />
      </div>
    </div>
  );
};

export default MobileSmartInbox;
