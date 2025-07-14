import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Layout,
  Sidebar,
  PanelLeft,
  PanelRight,
  Settings,
  MoreHorizontal,
  CheckSquare,
  MessageSquare,
  Archive,
  UserPlus,
  Search,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useInboxFilters } from '@/hooks/useInboxFilters';
import { SmartFilterBar } from './SmartFilterBar';
import { EnhancedConversationCard } from './EnhancedConversationCard';
import { InlineAIAssistant } from './InlineAIAssistant';
import { ChatInterface } from '../chat/ChatInterface';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ConversationListItem } from '@/types/conversation';

interface EnhancedSmartInboxProps {
  conversations?: ConversationListItem[];
  onSelectConversation?: (leadId: string) => void;
  selectedConversation?: string | null;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onRefresh?: () => void;
  totalConversations?: number;
  unreadCount?: number;
  aiInsights?: Record<string, any>;
  onSearch?: (query: string) => void;
  searchQuery?: string;
}

export const EnhancedSmartInbox: React.FC<EnhancedSmartInboxProps> = ({
  conversations = [],
  onSelectConversation,
  selectedConversation,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  onRefresh,
  totalConversations = 0,
  unreadCount = 0,
  aiInsights = {},
  onSearch,
  searchQuery: externalSearchQuery = ''
}) => {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState(externalSearchQuery);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [aiPanelCollapsed, setAiPanelCollapsed] = useState(false);
  const [showBatchActions, setShowBatchActions] = useState(false);

  // Sync external search query
  useEffect(() => {
    setSearchQuery(externalSearchQuery);
  }, [externalSearchQuery]);

  // Handle search changes
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  }, [onSearch]);

  const {
    filters,
    updateFilter: updateInboxFilter,
    clearFilters,
    hasActiveFilters,
    applyFilters,
    getFilterSummary,
    filtersLoaded
  } = useInboxFilters(profile?.id, profile?.role);

  // Enhanced filtering with search
  const filteredConversations = useMemo(() => {
    const startTime = performance.now();
    
    console.log('🔍 [ENHANCED-INBOX] Starting UI filtering:', {
      timestamp: new Date().toISOString(),
      inputConversations: conversations.length,
      searchQuery: searchQuery.trim(),
      inboundInInput: conversations.filter(c => c.lastMessageDirection === 'in').length,
      unreadInInput: conversations.filter(c => c.unreadCount > 0).length
    });

    let filtered = applyFilters(conversations);

    console.log('🎯 [ENHANCED-INBOX] After filters:', {
      afterFilters: filtered.length,
      removedByFilters: conversations.length - filtered.length
    });

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const beforeSearch = filtered.length;
      
      filtered = filtered.filter(conv => 
        conv.leadName?.toLowerCase().includes(query) ||
        conv.leadPhone?.toLowerCase().includes(query) ||
        conv.vehicleInterest?.toLowerCase().includes(query) ||
        conv.lastMessage?.toLowerCase().includes(query)
      );

      console.log('🔍 [ENHANCED-INBOX] After search filter:', {
        searchQuery: query,
        beforeSearch,
        afterSearch: filtered.length,
        removedBySearch: beforeSearch - filtered.length
      });
    }

    const endTime = performance.now();
    const inboundFiltered = filtered.filter(c => c.lastMessageDirection === 'in');
    const unreadFiltered = filtered.filter(c => c.unreadCount > 0);

    console.log('✅ [ENHANCED-INBOX] UI filtering complete:', {
      finalCount: filtered.length,
      inboundCount: inboundFiltered.length,
      unreadCount: unreadFiltered.length,
      processingTime: Math.round(endTime - startTime) + 'ms',
      topConversations: filtered.slice(0, 3).map(c => ({
        leadId: c.leadId,
        name: c.leadName,
        phone: c.primaryPhone,
        direction: c.lastMessageDirection,
        unreadCount: c.unreadCount
      }))
    });

    return filtered;
  }, [conversations, applyFilters, searchQuery]);

  // Batch actions handlers
  const handleSelectAll = useCallback(() => {
    if (selectedItems.size === filteredConversations.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredConversations.map(c => c.leadId)));
    }
  }, [filteredConversations, selectedItems.size]);

  const handleSelectItem = useCallback((leadId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(leadId);
    } else {
      newSelected.delete(leadId);
    }
    setSelectedItems(newSelected);
    setShowBatchActions(newSelected.size > 0);
  }, [selectedItems]);

  const handleBatchAction = useCallback((action: string) => {
    console.log(`Performing ${action} on`, Array.from(selectedItems));
    // Implement batch actions here
    setSelectedItems(new Set());
    setShowBatchActions(false);
  }, [selectedItems]);

  // Auto-update filters
  const handleFiltersChange = useCallback((newFilters: Partial<typeof filters>) => {
    Object.entries(newFilters).forEach(([key, value]) => {
      updateInboxFilter(key as keyof typeof filters, value);
    });
  }, [updateInboxFilter]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'a':
            e.preventDefault();
            handleSelectAll();
            break;
          case 'f':
            e.preventDefault();
            document.querySelector<HTMLInputElement>('input[placeholder*="Search"]')?.focus();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSelectAll]);

  const getCurrentConversation = () => {
    return filteredConversations.find(c => c.leadId === selectedConversation);
  };

  if (!filtersLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-card">
        <div className="p-3 md:p-4">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="flex items-center gap-2 md:gap-3">
              <h1 className="text-xl md:text-2xl font-bold">Smart Inbox</h1>
              <Badge variant="outline" className="text-xs">
                {filteredConversations.length} of {totalConversations}
              </Badge>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadCount} unread
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Layout Controls - Hidden on mobile */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden md:flex"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAiPanelCollapsed(!aiPanelCollapsed)}
                className="hidden lg:flex"
              >
                <PanelRight className="h-4 w-4" />
              </Button>

              {/* Refresh Button - Always visible */}
              {onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  className="hidden sm:flex"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}

              <Button variant="ghost" size="sm" className="hidden md:flex">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Smart Filter Bar - Responsive */}
          <div className="hidden md:block">
            <SmartFilterBar
              filters={filters}
              conversations={conversations}
              onFiltersChange={handleFiltersChange}
              onSearch={handleSearchChange}
              searchQuery={searchQuery}
              onClearAll={clearFilters}
              hasActiveFilters={hasActiveFilters}
              onRefresh={onRefresh}
            />
          </div>
          
          {/* Mobile Search Only */}
          <div className="md:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 bg-background"
              />
            </div>
          </div>
        </div>

        {/* Batch Actions Bar */}
        {showBatchActions && (
          <div className="border-t bg-muted/50 px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  <CheckSquare className="h-4 w-4 mr-1" />
                  {selectedItems.size === filteredConversations.length ? 'Deselect All' : 'Select All'}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {selectedItems.size} selected
                </span>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleBatchAction('mark_read')}
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Mark as Read
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleBatchAction('assign')}
                >
                  <UserPlus className="h-3 w-3 mr-1" />
                  Assign
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleBatchAction('archive')}
                >
                  <Archive className="h-3 w-3 mr-1" />
                  Archive
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Conversations List - Responsive */}
        <div className={`${
          sidebarCollapsed 
            ? 'w-16 md:w-16' 
            : 'w-full md:w-96'
        } ${
          selectedConversation && !sidebarCollapsed 
            ? 'hidden md:block' 
            : 'block'
        } border-r bg-card transition-all duration-200 flex flex-col overflow-hidden`}>
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-muted rounded-lg h-24" />
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No conversations found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {hasActiveFilters ? 'Try adjusting your filters' : 'New conversations will appear here'}
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className={`space-y-3 ${viewMode === 'grid' ? 'grid grid-cols-1 gap-3' : ''}`}>
                {filteredConversations.map((conversation, index) => {
                  // Log rendering of inbound messages and target number
                  if (conversation.lastMessageDirection === 'in' || 
                      conversation.primaryPhone === '+12513252469' || 
                      conversation.primaryPhone.replace(/\D/g, '') === '12513252469') {
                    console.log('🎨 [ENHANCED-INBOX] Rendering conversation card:', {
                      position: index + 1,
                      leadId: conversation.leadId,
                      name: conversation.leadName,
                      phone: conversation.primaryPhone,
                      direction: conversation.lastMessageDirection,
                      unreadCount: conversation.unreadCount,
                      lastMessage: conversation.lastMessage?.substring(0, 50),
                      isSelected: selectedConversation === conversation.leadId,
                      isTargetNumber: conversation.primaryPhone === '+12513252469' || 
                                     conversation.primaryPhone.replace(/\D/g, '') === '12513252469'
                    });
                  }

                  return (
                    <EnhancedConversationCard
                      key={conversation.leadId}
                      conversation={conversation}
                      isSelected={selectedConversation === conversation.leadId}
                      isSelectable={true}
                      isChecked={selectedItems.has(conversation.leadId)}
                      onSelect={onSelectConversation || (() => {})}
                      onCheck={handleSelectItem}
                      showAIInsights={true}
                      aiInsights={aiInsights[conversation.leadId] || {
                        confidence: Math.random() * 0.4 + 0.6,
                        urgencyLevel: conversation.unreadCount > 2 ? 'high' : 'medium',
                        buyingSignals: conversation.vehicleInterest ? ['vehicle interest'] : [],
                        nextBestAction: 'Send follow-up message'
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        
        {/* Mobile Back Button */}
        {selectedConversation && (
          <Button
            variant="outline"
            size="sm"
            className="md:hidden absolute top-4 left-4 z-10"
            onClick={() => onSelectConversation?.('')}
          >
            ← Back
          </Button>
        )}

        {/* Main Content Area - Responsive */}
        <div className={`${
          selectedConversation 
            ? 'flex-1' 
            : 'hidden md:flex md:flex-1'
        } flex transition-all duration-200 overflow-hidden min-h-0`}>
          {/* Chat Interface */}
          <div className="flex-1 bg-background relative overflow-hidden">
            <ChatInterface
              conversation={getCurrentConversation()}
              onMessageSent={onRefresh}
            />
          </div>

          {/* AI Assistant Panel - Hidden on mobile */}
          {!aiPanelCollapsed && (
            <div className="hidden lg:block w-80 border-l bg-card flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4">
                <InlineAIAssistant
                  conversation={getCurrentConversation()}
                  isVisible={true}
                  isLoading={isLoading}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};