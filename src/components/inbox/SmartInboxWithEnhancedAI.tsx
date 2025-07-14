
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

  // Log AI insights and prioritization results
  useEffect(() => {
    if (prioritizedConversations.length > 0) {
      const inboundPrioritized = prioritizedConversations.filter(c => c.lastMessageDirection === 'in');
      const unreadPrioritized = prioritizedConversations.filter(c => c.unreadCount > 0);
      
      console.log('🤖 [AI-INSIGHTS] AI prioritization complete:', {
        timestamp: new Date().toISOString(),
        originalCount: conversations.length,
        prioritizedCount: prioritizedConversations.length,
        inboundInPrioritized: inboundPrioritized.length,
        unreadInPrioritized: unreadPrioritized.length,
        aiInsightsCount: Object.keys(aiInsights).length,
        topPrioritized: prioritizedConversations.slice(0, 5).map(c => ({
          leadId: c.leadId,
          name: c.leadName,
          phone: c.primaryPhone,
          direction: c.lastMessageDirection,
          unreadCount: c.unreadCount,
          hasAIInsight: !!aiInsights[c.leadId]
        }))
      });
    }
  }, [prioritizedConversations, conversations, aiInsights]);

  // Apply local filters to conversations and ensure inbound messages are prioritized
  const filteredConversations = useMemo(() => {
    const startTime = performance.now();
    const sourceConversations = prioritizedConversations.length > 0 ? prioritizedConversations : conversations;
    
    console.log('🔍 [INBOX-TRACE] Starting conversation filtering:', {
      timestamp: new Date().toISOString(),
      sourceCount: sourceConversations.length,
      usingPrioritized: prioritizedConversations.length > 0,
      inboundInSource: sourceConversations.filter(c => c.lastMessageDirection === 'in').length,
      unreadInSource: sourceConversations.filter(c => c.unreadCount > 0).length,
      targetNumber: '+12513252469',
      hasTargetNumber: sourceConversations.some(c => 
        c.primaryPhone === '+12513252469' || 
        c.primaryPhone.replace(/\D/g, '') === '12513252469'
      )
    });

    let filtered = applyFilters(sourceConversations);
    
    console.log('🎯 [INBOX-TRACE] After filters applied:', {
      filteredCount: filtered.length,
      removedByFilters: sourceConversations.length - filtered.length,
      inboundAfterFilter: filtered.filter(c => c.lastMessageDirection === 'in').length,
      unreadAfterFilter: filtered.filter(c => c.unreadCount > 0).length
    });
    
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

    const endTime = performance.now();
    
    // Log final filtered results with special attention to inbound messages
    const inboundFiltered = filtered.filter(c => c.lastMessageDirection === 'in');
    const unreadFiltered = filtered.filter(c => c.unreadCount > 0);
    const targetConversation = filtered.find(c => 
      c.primaryPhone === '+12513252469' || 
      c.primaryPhone.replace(/\D/g, '') === '12513252469'
    );

    console.log('✅ [INBOX-TRACE] Final filtered conversations:', {
      finalCount: filtered.length,
      inboundCount: inboundFiltered.length,
      unreadCount: unreadFiltered.length,
      sortingTime: Math.round(endTime - startTime) + 'ms',
      targetFound: !!targetConversation,
      targetDetails: targetConversation ? {
        leadId: targetConversation.leadId,
        name: targetConversation.leadName,
        phone: targetConversation.primaryPhone,
        direction: targetConversation.lastMessageDirection,
        unreadCount: targetConversation.unreadCount,
        position: filtered.findIndex(c => c.leadId === targetConversation.leadId) + 1
      } : null,
      topInbound: inboundFiltered.slice(0, 5).map((c, index) => ({
        position: filtered.findIndex(fc => fc.leadId === c.leadId) + 1,
        leadId: c.leadId,
        name: c.leadName,
        phone: c.primaryPhone,
        unreadCount: c.unreadCount,
        lastMessage: c.lastMessage?.substring(0, 30)
      }))
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
      <div className="h-full flex items-center justify-center">
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
      <div className="h-full flex items-center justify-center">
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
      <div className="h-full flex items-center justify-center">
        <p className="text-lg font-medium text-gray-700">Please log in to view your inbox.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      <FilterRestorationBanner
        isRestored={isRestored}
        onClearFilters={handleClearRestoredFilters}
        onDismiss={handleDismissRestorationBanner}
      />
      
      <div className="flex-1 overflow-hidden">
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
    </div>
  );
};

export default SmartInboxWithEnhancedAI;
