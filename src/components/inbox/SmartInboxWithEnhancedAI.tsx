
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useInboxFilters, InboxFilters } from '@/hooks/useInboxFilters';
import { useConversationsList } from '@/hooks/conversation/useConversationsList';
import { useSmartInboxAI } from '@/hooks/useSmartInboxAI';
import { EnhancedSmartInbox } from './enhanced/EnhancedSmartInbox';
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

  // Use conversations list hook that integrates with get_latest_conversations_per_lead
  const {
    conversations,
    conversationsLoading: inboxLoading,
    refetchConversations: refresh
  } = useConversationsList();

  // Static values for compatibility
  const inboxError = null;
  const hasMore = false;
  const loadMore = () => {};
  const markAsRead = async (leadId: string) => {
    console.log('Mark as read:', leadId);
  };
  const sendMessage = async () => {};
  const setInboxSearch = () => {};
  const setInboxFilters = () => {};
  const searchQuery = '';
  const totalConversations = conversations.length;
  const unreadCount = conversations.filter(c => c.unreadCount > 0).length;

  // AI analysis for conversations
  const {
    prioritizedConversations,
    aiInsights,
    isAnalyzing,
    generateAIResponse,
    getConversationInsights,
    refreshAnalysis
  } = useSmartInboxAI({ 
    conversations,
    autoUpdate: true,
    updateInterval: 30000
  });

  // Apply local filters to conversations and ensure inbound messages are prioritized
  const filteredConversations = useMemo(() => {
    let filtered = applyFilters(prioritizedConversations.length > 0 ? prioritizedConversations : conversations);
    
    // Sort to prioritize inbound messages and unread conversations
    filtered.sort((a, b) => {
      // First: Unread messages come first
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      
      // Second: Inbound messages come before outbound
      if (a.lastMessageDirection === 'in' && b.lastMessageDirection === 'out') return -1;
      if (a.lastMessageDirection === 'out' && b.lastMessageDirection === 'in') return 1;
      
      // Third: Sort by most recent message
      return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
    });
    
    return filtered;
  }, [prioritizedConversations, conversations, applyFilters]);

  const handleFiltersChange = useCallback((newFilters: Partial<InboxFilters>) => {
    Object.entries(newFilters).forEach(([key, value]) => {
      updateFilter(key as keyof InboxFilters, value);
    });
    // Note: setInboxFilters not needed with useConversationsList
  }, [updateFilter]);

  const handleConversationSelect = useCallback(async (leadId: string) => {
    try {
      await markAsRead(leadId);
      console.log('Selected conversation:', leadId);
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  }, [markAsRead]);

  const handleRefresh = useCallback(() => {
    refresh();
    refreshAnalysis();
  }, [refresh, refreshAnalysis]);

  const handleClearRestoredFilters = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

  const handleDismissRestorationBanner = useCallback(() => {
    // Banner dismissal handled by useInboxFilters hook
  }, []);

  if (authLoading || inboxLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">
            {authLoading ? 'Loading inbox...' : 'Fetching conversations...'}
          </p>
        </div>
      </div>
    );
  }

  if (inboxError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-red-600">Error loading conversations</p>
          <p className="text-sm text-gray-600 mt-2">{inboxError}</p>
          <Button onClick={handleRefresh} className="mt-4">
            Try Again
          </Button>
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
        onSelectConversation={handleConversationSelect}
        selectedConversation={null}
        isLoading={inboxLoading || isAnalyzing}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onRefresh={handleRefresh}
        totalConversations={totalConversations}
        unreadCount={unreadCount}
        aiInsights={aiInsights}
        onSearch={setInboxSearch}
        searchQuery={searchQuery}
      />
    </div>
  );
};

export default SmartInboxWithEnhancedAI;
