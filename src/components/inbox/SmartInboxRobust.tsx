import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useConversationOperations } from '@/hooks/useConversationOperations';
import { useInboxFilters } from '@/hooks/useInboxFilters';
import { useMarkAsRead } from '@/hooks/useMarkAsRead';
import { smartInboxDataLoader } from '@/services/smartInboxDataLoader';
import ConversationsList from './ConversationsList';
import ConversationView from './ConversationView';
import SmartFilters from './SmartFilters';
import InboxDebugPanel from './InboxDebugPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, MessageSquare, Users, Clock, CheckCircle } from 'lucide-react';
import type { ConversationListItem } from '@/types/conversation';
import { ConversationListSkeleton } from '@/components/ui/skeletons/ConversationSkeleton';
import { MessageListSkeleton } from '@/components/ui/skeletons/MessageSkeleton';
import { Switch } from '@/components/ui/switch';
import { useAutoMarkAsReadSetting } from '@/hooks/inbox/useAutoMarkAsReadSetting';
import { NetworkStatus } from '@/components/ui/error/NetworkStatus';
import { useOptimisticUnreadCounts } from '@/hooks/useOptimisticUnreadCounts';

interface SmartInboxRobustProps {
  onBack?: () => void;
  leadId?: string;
}

const SmartInboxRobust: React.FC<SmartInboxRobustProps> = ({ onBack, leadId }) => {
  const { profile, loading: authLoading } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<ConversationListItem | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [showUrgencyColors, setShowUrgencyColors] = useState(false);
  const { enabled: autoMarkEnabled } = useAutoMarkAsReadSetting();

  const {
    conversations,
    messages,
    loading,
    error,
    loadConversations,
    loadMessages,
    sendMessage,
    manualRefresh, // Use manualRefresh instead of refreshConversations
    optimisticZeroUnread
  } = useConversationOperations({
    onLeadsRefresh: () => {
      console.log('🔄 [SMART INBOX ROBUST] Leads refresh triggered');
    }
  });

  const { 
    applyFilters, 
    filters, 
    updateFilter, 
    hasActiveFilters, 
    getFilterSummary, 
    clearFilters 
  } = useInboxFilters();
  const { markAsRead, isMarkingAsRead } = useMarkAsRead();

// Apply filters to conversations
const filteredConversations = applyFilters(conversations);
// Optimistic unread handling for display
const { markAsReadOptimistically, getEffectiveUnreadCount } = useOptimisticUnreadCounts();
const displayedConversations = filteredConversations.map(c => ({
  ...c,
  unreadCount: getEffectiveUnreadCount(c)
}));
const statusTabs = smartInboxDataLoader.statusTabs.map(tab => ({
  ...tab,
  count: tab.id === 'all' ? displayedConversations.length :
         tab.id === 'unread' ? displayedConversations.filter(c => c.unreadCount > 0).length :
         tab.id === 'assigned' ? displayedConversations.filter(c => c.salespersonId).length :
         tab.id === 'unassigned' ? displayedConversations.filter(c => !c.salespersonId).length : 0
}));

  // Load conversations on mount
  useEffect(() => {
    if (!authLoading && profile) {
      console.log('🚀 [SMART INBOX ROBUST] Loading initial conversations');
      loadConversations();
    }
  }, [authLoading, profile, loadConversations]);

// Auto-select conversation if leadId provided
useEffect(() => {
  if (leadId && filteredConversations.length > 0) {
    const conversation = filteredConversations.find(c => c.leadId === leadId);
    if (conversation) {
      const initialSelection = autoMarkEnabled ? { ...conversation, unreadCount: 0 } : conversation;
      setSelectedConversation(initialSelection);
      loadMessages(leadId);
    }
  }
}, [leadId, filteredConversations, loadMessages, autoMarkEnabled]);

const handleSelectConversation = useCallback((conversation: ConversationListItem) => {
  const selection = autoMarkEnabled ? { ...conversation, unreadCount: 0 } : conversation;
  setSelectedConversation(selection);
  loadMessages(conversation.leadId);
}, [loadMessages, autoMarkEnabled]);

  const handleSendMessage = useCallback(async (messageText: string) => {
    if (selectedConversation) {
      await sendMessage(selectedConversation.leadId, messageText);
    }
  }, [selectedConversation, sendMessage]);

const markAsReadWithRefresh = useCallback(async (leadId: string) => {
  optimisticZeroUnread(leadId);
  await markAsRead(leadId);
  await manualRefresh();
  if (selectedConversation?.leadId === leadId) {
    setSelectedConversation(prev => prev ? { ...prev, unreadCount: 0 } : prev);
  }
}, [optimisticZeroUnread, markAsRead, manualRefresh, selectedConversation?.leadId]);

const handleMarkAsRead = useCallback(async () => {
  if (selectedConversation) {
    markAsReadOptimistically(selectedConversation.leadId);
    await markAsReadWithRefresh(selectedConversation.leadId);
  }
}, [selectedConversation, markAsReadWithRefresh, markAsReadOptimistically]);

  const handleRefresh = useCallback(async () => {
    console.log('🔄 [SMART INBOX ROBUST] Manual refresh triggered');
    await manualRefresh();
  }, [manualRefresh]);

  if (authLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-lg font-medium">Loading Smart Inbox...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium">Authentication Required</p>
          <p className="text-gray-600">Please log in to access the Smart Inbox.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">❌ Error: {error}</div>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {onBack && (
              <Button onClick={onBack} variant="ghost" size="sm">
                ← Back
              </Button>
            )}
            <h1 className="text-xl font-semibold">Smart Inbox</h1>
          </div>
          <div className="flex items-center space-x-3">
            <NetworkStatus isOnline={navigator.onLine} lastUpdated={new Date()} />
            <Button
              onClick={handleRefresh}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <Button
              onClick={() => setShowDebugPanel(!showDebugPanel)}
              variant="outline"
              size="sm"
            >
              Debug
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex-shrink-0 border-b bg-card p-4">
        <SmartFilters 
          filters={filters} 
          onFiltersChange={(updates) => Object.entries(updates).forEach(([key, value]) => updateFilter(key as any, value))}
          conversations={conversations}
          filteredConversations={filteredConversations}
          hasActiveFilters={hasActiveFilters}
          filterSummary={getFilterSummary()}
          onClearFilters={clearFilters}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List */}
        <div className="w-1/3 border-r bg-card flex flex-col">
<div className="p-4 border-b bg-muted/50">
  <div className="flex items-center justify-between">
    <h2 className="font-medium">Conversations</h2>
    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
      <div className="flex items-center space-x-2">
        <Users className="h-4 w-4" />
        <span>{displayedConversations.length}</span>
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-xs">Urgency</span>
        <Switch checked={showUrgencyColors} onCheckedChange={setShowUrgencyColors} />
      </div>
    </div>
  </div>
</div>
          <div className="flex-1 overflow-auto">
            {loading ? (
              <ConversationListSkeleton />
            ) : filteredConversations.length === 0 ? (
              <div className="h-full flex items-center justify-center p-6 text-center">
                <div>
                  <h3 className="text-base font-medium text-muted-foreground mb-2">
                    {hasActiveFilters ? 'No conversations match your filters' : 'No conversations yet'}
                  </h3>
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={clearFilters} className="mr-2">
                      Clear filters
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={loading}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            ) : (
<ConversationsList
  conversations={displayedConversations}
  selectedLead={selectedConversation?.leadId}
  onSelectConversation={(leadId) => {
    const conversation = displayedConversations.find(c => c.leadId === leadId);
    if (conversation) handleSelectConversation(conversation);
  }}
  showUrgencyIndicator={showUrgencyColors}
  showTimestamps={true}
  markAsRead={async (leadId) => {
    markAsReadOptimistically(leadId);
    await markAsReadWithRefresh(leadId);
  }}
  isMarkingAsRead={isMarkingAsRead}
/>
            )}
          </div>
        </div>

        {/* Conversation View */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            loading ? (
              <MessageListSkeleton />
            ) : (
              <ConversationView
                conversation={selectedConversation}
                messages={messages.map(msg => ({ ...msg, sent_at: msg.sentAt }))}
                onBack={() => setSelectedConversation(null)}
                onSendMessage={handleSendMessage}
                onMarkAsRead={handleMarkAsRead}
                sending={loading}
                loading={loading}
                canReply={true}
              />
            )
          ) : (
            <div className="h-full flex items-center justify-center bg-muted/20">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  Select a conversation
                </h3>
                <p className="text-sm text-muted-foreground">
                  Choose a conversation from the list to view messages
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div className="px-3 py-1 text-xs bg-muted text-muted-foreground border-t">
          dev: authLoading={String(authLoading)} | loading={String(loading)} | conv={conversations.length} | filtered={filteredConversations.length} | selected={selectedConversation?.leadId ?? 'none'} | leadIdParam={leadId ?? 'none'}
        </div>
      )}

      {/* Debug Panel */}
      {showDebugPanel && (
        <InboxDebugPanel
          conversations={conversations}
          filteredConversations={filteredConversations}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
};

export default SmartInboxRobust;
