
import React, { useState } from 'react';
import EnhancedConversationHeader from './EnhancedConversationHeader';
import EnhancedConversationListItem from './EnhancedConversationListItem';
import EnhancedChatView from './EnhancedChatView';
import ConversationMemory from '../ConversationMemory';
import MessageThreadView from '../search/MessageThreadView';
import { useAdvancedMessageSearch } from '@/hooks/useAdvancedMessageSearch';
import type { ConversationListItem, MessageData } from '@/types/conversation';

interface OptimizedInboxLayoutProps {
  conversations: ConversationListItem[];
  messages: MessageData[];
  selectedLead: string | null;
  selectedConversation: ConversationListItem | undefined;
  showMemory: boolean;
  showTemplates: boolean;
  sendingMessage: boolean;
  loading: boolean;
  user: {
    role: string;
    id: string;
  };
  onSelectConversation: (leadId: string) => Promise<void>;
  onSendMessage: (message: string, isTemplate?: boolean) => Promise<void>;
  onToggleTemplates: () => void;
  canReply: (conv: any) => boolean;
  markAsRead: (leadId: string) => Promise<void>;
  markingAsRead: string | null;
  
  // Enhanced props
  searchQuery?: string;
  searchResults?: ConversationListItem[];
  predictions?: any[];
  onSearch?: (query: string) => void;
  messagesLoading?: boolean;
}

const OptimizedInboxLayout: React.FC<OptimizedInboxLayoutProps> = ({
  conversations,
  messages,
  selectedLead,
  selectedConversation,
  showMemory,
  showTemplates,
  sendingMessage,
  loading,
  user,
  onSelectConversation,
  onSendMessage,
  onToggleTemplates,
  canReply,
  markAsRead,
  markingAsRead,
  searchQuery = '',
  searchResults = [],
  predictions = [],
  onSearch,
  messagesLoading = false
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'thread'>('list');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'priority'>('newest');
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [showThreadView, setShowThreadView] = useState(false);
  const [selectedThread, setSelectedThread] = useState<any>(null);

  // Use advanced search hook for local filtering and search
  const {
    recentSearches,
    getUrgentMessages,
    getActionRequiredMessages,
    getThreadsForLead
  } = useAdvancedMessageSearch();

  // Apply filters and search to conversations
  const filteredConversations = React.useMemo(() => {
    let filtered = searchQuery && searchResults.length > 0 ? searchResults : conversations;

    // Apply quick filters
    if (activeFilters.has('unread')) {
      filtered = filtered.filter(conv => conv.unreadCount > 0);
    }
    if (activeFilters.has('urgent')) {
      filtered = filtered.filter(conv => 
        conv.status === 'urgent' || conv.aiStage === 'urgent'
      );
    }
    if (activeFilters.has('action_required')) {
      // This would need to be enhanced with actual action required detection
      filtered = filtered.filter(conv => conv.unreadCount > 0);
    }
    if (activeFilters.has('ai_generated')) {
      filtered = filtered.filter(conv => conv.aiOptIn);
    }
    if (activeFilters.has('incoming')) {
      filtered = filtered.filter(conv => conv.lastMessageDirection === 'in');
    }
    if (activeFilters.has('outgoing')) {
      filtered = filtered.filter(conv => conv.lastMessageDirection === 'out');
    }
    if (activeFilters.has('recent')) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      filtered = filtered.filter(conv => 
        new Date(conv.lastMessageTime) > oneDayAgo
      );
    }

    // Apply sorting
    switch (sortOrder) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.lastMessageTime).getTime() - new Date(b.lastMessageTime).getTime());
        break;
      case 'priority':
        filtered.sort((a, b) => {
          const aPriority = (a.unreadCount * 2) + (a.status === 'urgent' ? 10 : 0);
          const bPriority = (b.unreadCount * 2) + (b.status === 'urgent' ? 10 : 0);
          return bPriority - aPriority;
        });
        break;
    }

    return filtered;
  }, [conversations, searchResults, searchQuery, activeFilters, sortOrder]);

  // Calculate filter counts
  const filterCounts = React.useMemo(() => {
    return {
      urgent: conversations.filter(c => c.status === 'urgent' || c.aiStage === 'urgent').length,
      unread: conversations.filter(c => c.unreadCount > 0).length,
      actionRequired: conversations.filter(c => c.unreadCount > 0).length, // Simplified
      aiGenerated: conversations.filter(c => c.aiOptIn).length
    };
  }, [conversations]);

  const handleFilterToggle = (filterId: string) => {
    setActiveFilters(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(filterId)) {
        newFilters.delete(filterId);
      } else {
        newFilters.add(filterId);
      }
      return newFilters;
    });
  };

  const handleSearch = (query: string) => {
    onSearch?.(query);
  };

  const handleClearSearch = () => {
    onSearch?.('');
  };

  const handleThreadView = (leadId: string) => {
    const threads = getThreadsForLead(leadId);
    if (threads.length > 0) {
      setSelectedThread(threads[0]);
      setShowThreadView(true);
    }
  };

  // Grid layout for conversations
  const renderConversationGrid = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {filteredConversations.map((conversation) => (
          <EnhancedConversationListItem
            key={conversation.leadId}
            conversation={conversation}
            isSelected={selectedLead === conversation.leadId}
            onSelect={onSelectConversation}
            canReply={canReply(conversation)}
            markAsRead={markAsRead}
            isMarkingAsRead={markingAsRead === conversation.leadId}
            predictions={predictions}
            viewMode={viewMode}
          />
        ))}
      </div>
    );
  };

  // List layout for conversations
  const renderConversationList = () => {
    return (
      <div className="divide-y divide-gray-100">
        {filteredConversations.map((conversation) => (
          <EnhancedConversationListItem
            key={conversation.leadId}
            conversation={conversation}
            isSelected={selectedLead === conversation.leadId}
            onSelect={onSelectConversation}
            canReply={canReply(conversation)}
            markAsRead={markAsRead}
            isMarkingAsRead={markingAsRead === conversation.leadId}
            predictions={predictions}
            viewMode={viewMode}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="h-full flex">
      {/* Enhanced conversations sidebar */}
      <div className="w-96 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <EnhancedConversationHeader
          totalCount={conversations.length}
          filteredCount={filteredConversations.length}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
          searchQuery={searchQuery}
          onSearch={handleSearch}
          onClearSearch={handleClearSearch}
          isSearching={loading}
          recentSearches={recentSearches}
          activeFilters={activeFilters}
          onFilterToggle={handleFilterToggle}
          urgentCount={filterCounts.urgent}
          unreadCount={filterCounts.unread}
          actionRequiredCount={filterCounts.actionRequired}
          aiGeneratedCount={filterCounts.aiGenerated}
        />

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loading && filteredConversations.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <div className="text-center">
                <p>No conversations found</p>
                {activeFilters.size > 0 && (
                  <button
                    onClick={() => setActiveFilters(new Set())}
                    className="text-blue-600 hover:text-blue-800 text-sm mt-1"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            renderConversationGrid()
          ) : (
            renderConversationList()
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex">
        {showThreadView && selectedThread ? (
          <MessageThreadView
            thread={selectedThread}
            onBack={() => setShowThreadView(false)}
            onMessageClick={(messageId) => {
              // Handle message click in thread view
              console.log('Message clicked:', messageId);
            }}
            onSearchInThread={(query) => {
              // Handle search within thread
              console.log('Search in thread:', query);
            }}
          />
        ) : (
          <EnhancedChatView
            selectedConversation={selectedConversation}
            messages={messages}
            onSendMessage={onSendMessage}
            showTemplates={showTemplates}
            onToggleTemplates={onToggleTemplates}
            user={user}
            isLoading={sendingMessage || messagesLoading}
            onThreadView={selectedLead ? () => handleThreadView(selectedLead) : undefined}
          />
        )}

        {/* Memory panel */}
        {showMemory && selectedLead && (
          <ConversationMemory leadId={parseInt(selectedLead)} />
        )}
      </div>
    </div>
  );
};

export default OptimizedInboxLayout;
