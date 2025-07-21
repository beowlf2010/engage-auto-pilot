
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useConversationOperations } from '@/hooks/useConversationOperations';
import { useInboxFilters } from '@/hooks/useInboxFilters';
import { useMarkAsRead } from '@/hooks/useMarkAsRead';
import { smartInboxDataLoader } from '@/services/smartInboxDataLoader';
import ConversationsList from './ConversationsList';
import ConversationView from './ConversationView';
import InboxFilters from './InboxFilters';
import InboxDebugPanel from './InboxDebugPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, MessageSquare, Users, Clock, CheckCircle } from 'lucide-react';
import type { ConversationListItem } from '@/types/conversation';

interface SmartInboxRobustProps {
  onBack?: () => void;
  leadId?: string;
}

const SmartInboxRobust: React.FC<SmartInboxRobustProps> = ({ onBack, leadId }) => {
  const { profile, loading: authLoading } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<ConversationListItem | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  const {
    conversations,
    messages,
    loading,
    error,
    loadConversations,
    loadMessages,
    sendMessage,
    manualRefresh // Use manualRefresh instead of refreshConversations
  } = useConversationOperations({
    onLeadsRefresh: () => {
      console.log('🔄 [SMART INBOX ROBUST] Leads refresh triggered');
    }
  });

  const { applyFilters } = useInboxFilters();
  const { markAsRead, markingAsRead } = useMarkAsRead();

  // Apply filters to conversations
  const filteredConversations = applyFilters(conversations);

  const statusTabs = smartInboxDataLoader.statusTabs.map(tab => ({
    ...tab,
    count: tab.id === 'all' ? filteredConversations.length :
           tab.id === 'unread' ? filteredConversations.filter(c => c.unreadCount > 0).length :
           tab.id === 'assigned' ? filteredConversations.filter(c => c.salespersonId).length :
           tab.id === 'unassigned' ? filteredConversations.filter(c => !c.salespersonId).length : 0
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
        setSelectedConversation(conversation);
        loadMessages(leadId);
      }
    }
  }, [leadId, filteredConversations, loadMessages]);

  const handleSelectConversation = useCallback((conversation: ConversationListItem) => {
    setSelectedConversation(conversation);
    loadMessages(conversation.leadId);
  }, [loadMessages]);

  const handleSendMessage = useCallback(async (messageText: string) => {
    if (selectedConversation) {
      await sendMessage(selectedConversation.leadId, messageText);
    }
  }, [selectedConversation, sendMessage]);

  const handleMarkAsRead = useCallback(async () => {
    if (selectedConversation) {
      await markAsRead(selectedConversation.leadId);
      manualRefresh(); // Use manualRefresh here too
    }
  }, [selectedConversation, markAsRead, manualRefresh]);

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
          <div className="flex items-center space-x-2">
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
        <InboxFilters statusTabs={statusTabs} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List */}
        <div className="w-1/3 border-r bg-card flex flex-col">
          <div className="p-4 border-b bg-muted/50">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Conversations</h2>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{filteredConversations.length}</span>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <ConversationsList
              conversations={filteredConversations}
              selectedLead={selectedConversation?.leadId}
              onSelectConversation={(leadId) => {
                const conversation = filteredConversations.find(c => c.leadId === leadId);
                if (conversation) handleSelectConversation(conversation);
              }}
              showUrgencyIndicator={true}
              showTimestamps={true}
              markAsRead={markAsRead}
              markingAsRead={markingAsRead}
            />
          </div>
        </div>

        {/* Conversation View */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <ConversationView
              conversation={selectedConversation}
              messages={messages}
              onBack={() => setSelectedConversation(null)}
              onSendMessage={handleSendMessage}
              onMarkAsRead={handleMarkAsRead}
              sending={loading}
              loading={loading}
              canReply={true}
            />
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
