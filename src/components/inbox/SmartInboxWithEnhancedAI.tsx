import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useInboxFilters, InboxFilters } from '@/hooks/useInboxFilters';
import SmartFilters from './SmartFilters';
import FilterRestorationBanner from './FilterRestorationBanner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConversationListItem } from '@/types/conversation';

const SmartInboxWithEnhancedAI = () => {
  const { profile, loading: authLoading } = useAuth();

  const {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    applyFilters,
    getFilterSummary,
    isRestored,
    filtersLoaded
  } = useInboxFilters(profile?.id, profile?.role);

  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<ConversationListItem[]>([]);
  const [stats, setStats] = useState({ total: 0, unread: 0 });

  // Fetch conversations (mocked here, replace with real data fetching)
  useEffect(() => {
    // TODO: Replace with actual data fetching logic
    const fetchConversations = async () => {
      // Mock data
      const data: ConversationListItem[] = [];
      setConversations(data);
    };
    fetchConversations();
  }, []);

  // Apply filters whenever conversations or filters change
  useEffect(() => {
    const filtered = applyFilters(conversations);
    setFilteredConversations(filtered);

    setStats({
      total: conversations.length,
      unread: conversations.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0)
    });
  }, [conversations, applyFilters]);

  // Fix the handleFiltersChange function to properly merge all filter properties
  const handleFiltersChange = useCallback((newFilters: Partial<InboxFilters>) => {
    // Instead of overwriting, merge the new filters with existing ones
    const mergedFilters = { ...filters, ...newFilters };
    
    // Update each individual filter to maintain proper state
    Object.entries(newFilters).forEach(([key, value]) => {
      updateFilter(key as keyof InboxFilters, value);
    });
    
    console.log('🔧 [SMART INBOX] Filters updated:', newFilters);
  }, [filters, updateFilter]);

  const handleUnreadBadgeClick = useCallback(() => {
    if (filters.unreadOnly) {
      updateFilter('unreadOnly', false);
    } else {
      updateFilter('unreadOnly', true);
    }
  }, [filters.unreadOnly, updateFilter]);

  const handleClearRestoredFilters = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

  const handleDismissRestorationBanner = useCallback(() => {
    // Just hide the banner by marking as not restored
    // This could be managed by a local state or context if needed
    // For now, do nothing as isRestored is managed by useInboxFilters
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">Loading inbox...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg font-medium text-gray-700">Please log in to view your inbox.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <FilterRestorationBanner
        isRestored={isRestored}
        onClearFilters={handleClearRestoredFilters}
        onDismiss={handleDismissRestorationBanner}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col">
          {/* Header with stats and controls */}
          <div className="bg-white border-b px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-slate-800">Smart Inbox</h1>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-slate-600">
                  {stats.total} conversations
                </Badge>
                {stats.unread > 0 && (
                  <Button
                    onClick={handleUnreadBadgeClick}
                    variant="ghost"
                    size="sm"
                    className={`h-auto p-0 hover:bg-transparent ${
                      filters.unreadOnly 
                        ? 'ring-2 ring-red-400 ring-offset-1' 
                        : ''
                    }`}
                    title={filters.unreadOnly ? 'Click to show all messages' : 'Click to filter unread messages'}
                  >
                    <Badge 
                      variant="destructive" 
                      className={`cursor-pointer transition-all hover:bg-red-600 ${
                        filters.unreadOnly 
                          ? 'bg-red-600 shadow-md' 
                          : 'bg-red-500'
                      }`}
                    >
                      {stats.unread} unread
                    </Badge>
                  </Button>
                )}
              </div>
            </div>

            {/* Smart Filters */}
            <SmartFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              conversations={conversations}
              filteredConversations={filteredConversations}
              hasActiveFilters={hasActiveFilters}
              filterSummary={getFilterSummary()}
              onClearFilters={clearFilters}
              userRole={profile?.role}
            />
          </div>

          {/* Conversations list and other components would go here */}
          <div className="flex-1 overflow-auto p-6">
            {/* Placeholder for conversation list */}
            {filteredConversations.length === 0 ? (
              <p className="text-center text-gray-500">No conversations match the current filters.</p>
            ) : (
              <ul className="space-y-4">
                {filteredConversations.map(conv => (
                  <li key={conv.id} className="bg-white p-4 rounded shadow">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-slate-800">{conv.customerName || 'Unknown Customer'}</p>
                        <p className="text-sm text-slate-600">{conv.lastMessagePreview || 'No messages yet'}</p>
                      </div>
                      {conv.unreadCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {conv.unreadCount} unread
                        </Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartInboxWithEnhancedAI;
