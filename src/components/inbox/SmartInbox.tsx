
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useConversationOperations } from '@/hooks/useConversationOperations';
import { useInboxFilters } from '@/hooks/useInboxFilters';
import { useMarkAsRead } from '@/hooks/useMarkAsRead';
import InboxConversationsList from './InboxConversationsList';
import ConversationView from './ConversationView';
import SmartFilters from './SmartFilters';
import InboxStatusDisplay from './InboxStatusDisplay';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import type { ConversationListItem } from '@/types/conversation';

interface SmartInboxProps {
  onBack?: () => void;
  leadId?: string;
}

const SmartInbox: React.FC<SmartInboxProps> = ({ onBack, leadId }) => {
  const { profile } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<ConversationListItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
    console.log('📱 [SMART INBOX] Loading conversations on mount');
    loadConversations();
  }, [loadConversations]);

  // Auto-select conversation if leadId provided
  useEffect(() => {
    if (leadId && conversations.length > 0 && !selectedConversation) {
      const conversation = conversations.find(c => c.leadId === leadId);
      if (conversation) {
        console.log('📱 [SMART INBOX] Auto-selecting conversation for lead:', leadId);
        setSelectedConversation(conversation);
        loadMessages(leadId);
      }
    }
  }, [leadId, conversations, selectedConversation, loadMessages]);

  // Apply filters to conversations
  const displayConversations = applyFilters(conversations, filters, searchQuery);

  const handleConversationSelect = useCallback(async (conversation: ConversationListItem) => {
    console.log('📱 [SMART INBOX] Selecting conversation:', conversation.leadId);
    setSelectedConversation(conversation);
    try {
      await loadMessages(conversation.leadId);
    } catch (error) {
      console.error('Error selecting conversation:', error);
      toast({
        title: "Error",
        description: "Failed to load conversation messages",
        variant: "destructive"
      });
    }
  }, [loadMessages]);

  const handleSendMessageWrapper = useCallback(async (message: string) => {
    if (!selectedConversation) return;
    
    try {
      await sendMessage(selectedConversation.leadId, message);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, [selectedConversation, sendMessage]);

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
    console.log('📱 [SMART INBOX] Retrying data load');
    manualRefresh();
  }, [manualRefresh]);

  // Show status display for loading, error, or empty states
  if (loading || error || conversations.length === 0) {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-card">
          <div className="flex items-center gap-2">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <h1 className="text-xl font-semibold">Smart Inbox</h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
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
        canReply={true}
        loading={loading}
        error={error}
      />
    );
  }

  // Show main inbox view
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <h1 className="text-xl font-semibold">Smart Inbox</h1>
          <span className="text-sm text-muted-foreground">
            ({displayConversations.length} conversations)
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={handleRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="p-4 border-b bg-card">
        <Input
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Filters */}
      <div className="border-b bg-card">
        <SmartFilters
          filters={filters}
          onFiltersChange={updateFilters}
          conversations={conversations}
          filteredConversations={displayConversations}
          hasActiveFilters={Object.values(filters).some(v => v !== null && v !== false && v !== '' && (!Array.isArray(v) || v.length > 0))}
          filterSummary={[]}
          onClearFilters={clearFilters}
          userRole={profile?.role}
        />
      </div>

      {/* Conversations List */}
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

export default SmartInbox;
