import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  UserPlus
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useInboxFilters } from '@/hooks/useInboxFilters';
import { SmartFilterBar } from './SmartFilterBar';
import { EnhancedConversationCard } from './EnhancedConversationCard';
import { InlineAIAssistant } from './InlineAIAssistant';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ConversationListItem } from '@/types/conversation';

interface EnhancedSmartInboxProps {
  conversations?: ConversationListItem[];
  onSelectConversation?: (leadId: string) => void;
  selectedConversation?: string | null;
  isLoading?: boolean;
}

export const EnhancedSmartInbox: React.FC<EnhancedSmartInboxProps> = ({
  conversations = [],
  onSelectConversation,
  selectedConversation,
  isLoading = false
}) => {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [aiPanelCollapsed, setAiPanelCollapsed] = useState(false);
  const [showBatchActions, setShowBatchActions] = useState(false);

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
    let filtered = applyFilters(conversations);

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(conv => 
        conv.leadName?.toLowerCase().includes(query) ||
        conv.leadPhone?.toLowerCase().includes(query) ||
        conv.vehicleInterest?.toLowerCase().includes(query) ||
        conv.lastMessage?.toLowerCase().includes(query)
      );
    }

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
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Smart Inbox</h1>
              <Badge variant="outline">
                {filteredConversations.length} of {conversations.length}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Layout Controls */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAiPanelCollapsed(!aiPanelCollapsed)}
              >
                <PanelRight className="h-4 w-4" />
              </Button>

              <Select value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="list">
                    <Layout className="h-3 w-3 mr-1" />
                    List
                  </SelectItem>
                  <SelectItem value="grid">
                    <Layout className="h-3 w-3 mr-1" />
                    Grid
                  </SelectItem>
                </SelectContent>
              </Select>

              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Smart Filter Bar */}
          <SmartFilterBar
            filters={filters}
            conversations={conversations}
            onFiltersChange={handleFiltersChange}
            onSearch={setSearchQuery}
            searchQuery={searchQuery}
            onClearAll={clearFilters}
            hasActiveFilters={hasActiveFilters}
          />
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
      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List */}
        <div className={`${sidebarCollapsed ? 'w-16' : 'w-96'} border-r bg-card transition-all duration-200`}>
          <div className="h-full overflow-auto p-4">
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
                {filteredConversations.map((conversation) => (
                  <EnhancedConversationCard
                    key={conversation.leadId}
                    conversation={conversation}
                    isSelected={selectedConversation === conversation.leadId}
                    isSelectable={true}
                    isChecked={selectedItems.has(conversation.leadId)}
                    onSelect={onSelectConversation || (() => {})}
                    onCheck={handleSelectItem}
                    showAIInsights={true}
                    aiInsights={{
                      confidence: Math.random() * 0.4 + 0.6, // Mock data
                      urgencyLevel: conversation.unreadCount > 2 ? 'high' : 'medium',
                      buyingSignals: conversation.vehicleInterest ? ['vehicle interest'] : [],
                      nextBestAction: 'Send follow-up message'
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex">
          {/* Chat/Detail View */}
          <div className="flex-1 bg-background">
            {selectedConversation ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">Chat View</h3>
                  <p className="text-sm text-muted-foreground">
                    Selected: {getCurrentConversation()?.leadName}
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Welcome to Smart Inbox</h2>
                  <p className="text-muted-foreground mb-6">
                    Select a conversation to start chatting. Use the smart filters to find exactly what you need.
                  </p>
                  <div className="text-sm text-muted-foreground">
                    <p>💡 Tip: Use Ctrl+F to search, Ctrl+A to select all</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* AI Assistant Panel */}
          {!aiPanelCollapsed && (
            <div className="w-80 border-l bg-card">
              <div className="h-full overflow-auto p-4">
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