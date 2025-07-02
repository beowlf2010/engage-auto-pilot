
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useInboxFilters, InboxFilters } from '@/hooks/useInboxFilters';
import { EnhancedSmartInbox } from './enhanced/EnhancedSmartInbox';
import SmartFilters from './SmartFilters';
import FilterRestorationBanner from './FilterRestorationBanner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConversationListItem } from '@/types/conversation';

/**
 * Smart Inbox component with enhanced AI capabilities and filter management
 */
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

  // Fetch conversations - TODO: Replace with actual data fetching logic
  useEffect(() => {
    const fetchConversations = async () => {
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

  const handleFiltersChange = useCallback((newFilters: Partial<InboxFilters>) => {
    Object.entries(newFilters).forEach(([key, value]) => {
      updateFilter(key as keyof InboxFilters, value);
    });
  }, [updateFilter]);

  const handleUnreadBadgeClick = useCallback(() => {
    updateFilter('unreadOnly', !filters.unreadOnly);
  }, [filters.unreadOnly, updateFilter]);

  const handleClearRestoredFilters = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

  const handleDismissRestorationBanner = useCallback(() => {
    // Banner dismissal handled by useInboxFilters hook
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
    <div className="h-full bg-background">
      <FilterRestorationBanner
        isRestored={isRestored}
        onClearFilters={handleClearRestoredFilters}
        onDismiss={handleDismissRestorationBanner}
      />
      
      <EnhancedSmartInbox
        conversations={filteredConversations}
        onSelectConversation={(leadId) => {
          console.log('Selected conversation:', leadId);
          // Handle conversation selection
        }}
        selectedConversation={null}
        isLoading={authLoading}
      />
    </div>
  );
};

export default SmartInboxWithEnhancedAI;
