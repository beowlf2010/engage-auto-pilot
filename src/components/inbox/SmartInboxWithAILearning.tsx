
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useEnhancedRealtimeInbox } from '@/hooks/useEnhancedRealtimeInbox';
import { useMarkAsRead } from '@/hooks/useMarkAsRead';
import { useInboxFilters } from '@/hooks/useInboxFilters';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, Users, Clock, Zap, Brain, Sparkles, Filter, Search } from 'lucide-react';
import EnhancedConversationListItem from './EnhancedConversationListItem';
import EnhancedMessageBubble from './EnhancedMessageBubble';
import InventoryAwareMessageInput from './InventoryAwareMessageInput';
import ConnectionStatusIndicator from './ConnectionStatusIndicator';
import LeadContextPanel from './LeadContextPanel';
import EnhancedConversationHeader from './EnhancedConversationHeader';
import QuickFilters from './QuickFilters';
import SmartFilters from './SmartFilters';
import AILearningInsightsPanel from './AILearningInsightsPanel';
import { ConversationListItem, MessageData } from '@/types/conversation';
import { toast } from '@/hooks/use-toast';
import { useEnhancedConnectionManager } from '@/hooks/useEnhancedConnectionManager';

interface SmartInboxWithEnhancedAIProps {
  onLeadsRefresh?: () => void;
  user?: {
    role: string;
    id: string;
  };
}

const SmartInboxWithEnhancedAI: React.FC<SmartInboxWithEnhancedAIProps> = ({ onLeadsRefresh, user }) => {
  const { profile } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<ConversationListItem | null>(null);
  const [messageText, setMessageText] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'thread'>('list');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'priority'>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuickFilters, setActiveQuickFilters] = useState<Set<string>>(new Set());
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [aiInsights, setAIInsights] = useState<any>(null);
  const [aiOptimizationQueue, setAIOptimizationQueue] = useState<any[]>([]);
  const [isAILearning, setIsAILearning] = useState(false);

  // Use the passed user prop or fall back to profile from auth
  const currentUser = user || (profile ? { id: profile.id, role: profile.role } : null);

  // Initialize filters
  const { filters, updateFilter, clearFilters, hasActiveFilters, applyFilters } = useInboxFilters(currentUser?.id);

  const {
    conversations: rawConversations,
    messages,
    loading,
    sendingMessage,
    loadMessages,
    sendMessage,
    retryMessage,
    manualRefresh
  } = useEnhancedRealtimeInbox({ onLeadsRefresh });

  // Use the actual markAsRead hook instead of mock function
  const { markAsRead, isMarkingAsRead } = useMarkAsRead();

  // Enhanced connection manager for better status handling
  const { connectionState, forceReconnect, forceSync } = useEnhancedConnectionManager({
    onMessageUpdate: (leadId: string) => {
      if (selectedConversation?.leadId === leadId) {
        loadMessages(leadId);
      }
    },
    onConversationUpdate: manualRefresh,
    onUnreadCountUpdate: manualRefresh
  });

  // Apply filters and search to conversations
  const filteredConversations = useMemo(() => {
    let filtered = applyFilters(rawConversations);
    
    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(conv => 
        conv.leadName.toLowerCase().includes(query) ||
        conv.vehicleInterest.toLowerCase().includes(query) ||
        conv.leadPhone.includes(query) ||
        conv.lastMessage.toLowerCase().includes(query)
      );
    }

    // Apply quick filters
    if (activeQuickFilters.has('unread')) {
      filtered = filtered.filter(conv => conv.unreadCount > 0);
    }
    if (activeQuickFilters.has('urgent')) {
      filtered = filtered.filter(conv => conv.unreadCount > 3);
    }
    if (activeQuickFilters.has('action_required')) {
      filtered = filtered.filter(conv => conv.lastMessageDirection === 'in' && conv.unreadCount > 0);
    }
    if (activeQuickFilters.has('incoming')) {
      filtered = filtered.filter(conv => conv.lastMessageDirection === 'in');
    }
    if (activeQuickFilters.has('outgoing')) {
      filtered = filtered.filter(conv => conv.lastMessageDirection === 'out');
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortOrder) {
        case 'oldest':
          return (a.lastMessageDate?.getTime() || 0) - (b.lastMessageDate?.getTime() || 0);
        case 'priority':
          return b.unreadCount - a.unreadCount;
        case 'newest':
        default:
          return (b.lastMessageDate?.getTime() || 0) - (a.lastMessageDate?.getTime() || 0);
      }
    });
  }, [rawConversations, applyFilters, searchQuery, activeQuickFilters, sortOrder]);

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    return {
      unread: rawConversations.filter(c => c.unreadCount > 0).length,
      urgent: rawConversations.filter(c => c.unreadCount > 3).length,
      actionRequired: rawConversations.filter(c => c.lastMessageDirection === 'in' && c.unreadCount > 0).length,
      aiGenerated: rawConversations.filter(c => c.aiMessagesSent && c.aiMessagesSent > 0).length
    };
  }, [rawConversations]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.leadId);
      setShowAIInsights(true);
    }
  }, [selectedConversation, loadMessages]);

  const handleSendMessage = useCallback(async (messageContent: string) => {
    if (!selectedConversation || !messageContent.trim()) return;

    try {
      await sendMessage(selectedConversation.leadId, messageContent.trim());
      setMessageText('');
      
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully",
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive"
      });
    }
  }, [selectedConversation, sendMessage]);

  const handleConversationSelect = useCallback((conversation: ConversationListItem) => {
    setSelectedConversation(conversation);
  }, []);

  // Enhanced markAsRead that refreshes conversations and triggers onLeadsRefresh
  const handleMarkAsRead = useCallback(async (leadId: string) => {
    try {
      await markAsRead(leadId);
      
      // Refresh conversations to update unread counts
      manualRefresh();
      
      // Trigger leads refresh if provided
      if (onLeadsRefresh) {
        onLeadsRefresh();
      }
      
      console.log('✅ [SMART INBOX] Successfully marked messages as read and refreshed');
    } catch (error) {
      console.error('❌ [SMART INBOX] Error marking messages as read:', error);
    }
  }, [markAsRead, manualRefresh, onLeadsRefresh]);

  const canReply = useMemo(() => {
    const userId = currentUser?.id || profile?.id;
    return selectedConversation && 
           (selectedConversation.salespersonId === userId || 
            selectedConversation.salespersonId === null);
  }, [selectedConversation, currentUser?.id, profile?.id]);

  const conversationMessages = useMemo(() => {
    return messages.map(msg => ({
      ...msg,
      leadName: selectedConversation?.leadName || '',
      vehicleInterest: selectedConversation?.vehicleInterest || ''
    }));
  }, [messages, selectedConversation]);

  const handleQuickFilterToggle = useCallback((filterId: string) => {
    setActiveQuickFilters(prev => {
      const updated = new Set(prev);
      if (updated.has(filterId)) {
        updated.delete(filterId);
      } else {
        updated.add(filterId);
      }
      return updated;
    });
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleProcessOptimizations = useCallback(() => {
    console.log('Processing AI optimizations...');
    setIsAILearning(true);
    // Simulate processing
    setTimeout(() => {
      setIsAILearning(false);
      setAIOptimizationQueue([]);
    }, 2000);
  }, []);

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-gray-50">
      {/* Left Sidebar - Conversations List with Enhanced Header */}
      <div className="w-1/3 border-r bg-white flex flex-col">
        {/* Enhanced Header */}
        <EnhancedConversationHeader
          totalCount={rawConversations.length}
          filteredCount={filteredConversations.length}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
          searchQuery={searchQuery}
          onSearch={handleSearch}
          onClearSearch={handleClearSearch}
          activeFilters={activeQuickFilters}
          onFilterToggle={handleQuickFilterToggle}
          urgentCount={filterCounts.urgent}
          unreadCount={filterCounts.unread}
          actionRequiredCount={filterCounts.actionRequired}
          aiGeneratedCount={filterCounts.aiGenerated}
        />

        {/* Smart Filters */}
        {hasActiveFilters && (
          <div className="px-4 pb-4">
            <SmartFilters
              filters={filters}
              onFiltersChange={(newFilters) => {
                Object.entries(newFilters).forEach(([key, value]) => {
                  updateFilter(key as any, value);
                });
              }}
              conversations={rawConversations}
            />
          </div>
        )}

        {/* Connection Status */}
        <div className="px-4 pb-2">
          <ConnectionStatusIndicator 
            connectionState={connectionState} 
            onReconnect={forceReconnect}
            onForceSync={forceSync}
          />
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No conversations found</p>
              {(searchQuery || hasActiveFilters || activeQuickFilters.size > 0) && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => {
                    handleClearSearch();
                    clearFilters();
                    setActiveQuickFilters(new Set());
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <EnhancedConversationListItem
                key={conversation.leadId}
                conversation={conversation}
                isSelected={selectedConversation?.leadId === conversation.leadId}
                onSelect={() => handleConversationSelect(conversation)}
                canReply={canReply || false}
                markAsRead={handleMarkAsRead}
                isMarkingAsRead={isMarkingAsRead}
              />
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{selectedConversation.leadName}</h3>
                  <p className="text-sm text-gray-600">{selectedConversation.vehicleInterest}</p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedConversation.unreadCount > 0 && (
                    <Badge variant="destructive">
                      {selectedConversation.unreadCount} unread
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {selectedConversation.status}
                  </Badge>
                  {selectedConversation.aiOptIn && (
                    <Badge variant="outline" className="bg-purple-100 text-purple-700">
                      <Brain className="h-3 w-3 mr-1" />
                      AI Enabled
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {conversationMessages.map((message) => (
                <EnhancedMessageBubble
                  key={message.id}
                  message={message}
                  onRetry={message.smsStatus === 'failed' ? () => retryMessage(selectedConversation.leadId, message.id) : undefined}
                />
              ))}
            </div>

            {/* Message Input */}
            {canReply && (
              <div className="p-4 border-t bg-white">
                <InventoryAwareMessageInput
                  leadId={selectedConversation.leadId}
                  conversationHistory={conversationMessages.map(m => `${m.direction === 'in' ? 'Customer' : 'Sales'}: ${m.body}`).join('\n')}
                  onSendMessage={handleSendMessage}
                  disabled={sendingMessage}
                  placeholder="Type your message..."
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
              <p>Choose a conversation from the left to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - Lead Context Panel with AI Integration */}
      {selectedConversation && (
        <div className="w-80 border-l bg-white flex flex-col">
          <LeadContextPanel
            conversation={selectedConversation}
            onScheduleAppointment={() => {
              console.log('Schedule appointment for:', selectedConversation.leadName);
            }}
          />
          
          {/* AI Learning Insights */}
          {showAIInsights && (
            <div className="border-t">
              <AILearningInsightsPanel
                leadId={selectedConversation.leadId}
                insights={aiInsights}
                optimizationQueue={aiOptimizationQueue}
                isLearning={isAILearning}
                onProcessOptimizations={handleProcessOptimizations}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartInboxWithEnhancedAI;
