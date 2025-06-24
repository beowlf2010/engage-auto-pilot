
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useOptimizedInbox } from '@/hooks/useOptimizedInbox';
import { useInboxFilters } from '@/hooks/useInboxFilters';
import { useMarkAsRead } from '@/hooks/useMarkAsRead';
import InboxConversationsList from './InboxConversationsList';
import ConversationView from './ConversationView';
import LeadContextPanel from './LeadContextPanel';
import SmartFilters from './SmartFilters';
import AIResponseSuggestionPanel from './AIResponseSuggestionPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, MessageSquare, Users, Loader2, WifiOff, Brain } from 'lucide-react';
import { Input } from '@/components/ui/input';

const ConsolidatedSmartInbox = ({ onLeadsRefresh }: { onLeadsRefresh?: () => void }) => {
  const { profile } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(true);

  const {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    applyFilters,
    getFilterSummary
  } = useInboxFilters(profile?.id, profile?.role);

  const {
    conversations,
    messages,
    loading,
    error,
    sendingMessage,
    totalUnreadCount,
    loadingUnreadCount,
    loadMessages,
    sendMessage,
    manualRefresh
  } = useOptimizedInbox({ onLeadsRefresh });

  const { markAsRead, isMarkingAsRead } = useMarkAsRead();

  // Filter and sort conversations - newest first by default
  const filteredAndSortedConversations = useMemo(() => {
    let filtered = conversations;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(conv =>
        conv.leadName.toLowerCase().includes(query) ||
        conv.vehicleInterest.toLowerCase().includes(query) ||
        conv.leadPhone.includes(query)
      );
    }

    // Apply advanced filters
    filtered = applyFilters(filtered);

    // Debug logging for unread messages
    const unreadFiltered = filtered.filter(c => c.unreadCount > 0);
    console.log('🔍 [CONSOLIDATED SMART INBOX] Filter debug:', {
      totalConversations: conversations.length,
      afterSearchFilter: filtered.length,
      unreadInFiltered: unreadFiltered.length,
      totalUnreadCount: totalUnreadCount,
      unreadConversations: unreadFiltered.map(c => ({
        leadId: c.leadId,
        leadName: c.leadName,
        unreadCount: c.unreadCount,
        lastMessage: c.lastMessage,
        lastMessageDirection: c.lastMessageDirection
      })),
      currentFilters: filters
    });

    // Sort by newest first (most recent activity)
    return filtered.sort((a, b) => {
      const aTime = new Date(a.lastMessageTime || a.lastMessageDate).getTime();
      const bTime = new Date(b.lastMessageTime || b.lastMessageDate).getTime();
      return bTime - aTime; // Newest first
    });
  }, [conversations, searchQuery, applyFilters, filters, totalUnreadCount]);

  const selectedConversation = selectedConversationId 
    ? conversations.find(c => c.leadId === selectedConversationId)
    : null;

  // Check if user can reply to the selected conversation
  const canReply = useCallback((conv: any) => {
    if (!conv) return false;
    // Managers and admins can reply to any conversation
    if (profile?.role === "manager" || profile?.role === "admin") return true;
    // Sales users can reply to their own leads or unassigned leads
    return conv.salespersonId === profile?.id || !conv.salespersonId;
  }, [profile?.role, profile?.id]);

  const handleConversationSelect = useCallback(async (conversation: any) => {
    const conversationId = conversation.leadId;
    setSelectedConversationId(conversationId);
    
    console.log('📱 [CONSOLIDATED SMART INBOX] Loading messages for conversation:', conversationId);
    await loadMessages(conversation.leadId);
    
    // Auto-mark as read if there are unread messages
    if (conversation.unreadCount > 0) {
      console.log('📖 [CONSOLIDATED SMART INBOX] Auto-marking conversation as read');
      await markAsRead(conversation.leadId);
      
      // Force refresh of global unread count after marking as read
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('unread-count-changed'));
        manualRefresh(); // Refresh to update totalUnreadCount
      }, 1000);
    }
  }, [loadMessages, markAsRead, manualRefresh]);

  const handleSendMessage = useCallback(async (messageContent: string) => {
    if (!selectedConversation?.leadId) return;
    
    console.log('📤 [CONSOLIDATED SMART INBOX] Sending message');
    await sendMessage(selectedConversation.leadId, messageContent);
    
    // Refresh conversations list to update unread counts
    setTimeout(manualRefresh, 500);
  }, [selectedConversation?.leadId, sendMessage, manualRefresh]);

  const handleFiltersChange = useCallback((newFilters: any) => {
    if (typeof newFilters === 'object' && newFilters !== null) {
      Object.keys(newFilters).forEach(key => {
        updateFilter(key as any, newFilters[key]);
      });
    }
  }, [updateFilter]);

  // Stats calculation - use totalUnreadCount for accurate global count
  const stats = useMemo(() => {
    const unreadConversations = filteredAndSortedConversations.filter(c => c.unreadCount > 0).length;
    const lostStatusConversations = conversations.filter(c => c.status === 'lost').length;
    const unassignedConversations = conversations.filter(c => !c.salespersonId).length;
    
    return {
      total: filteredAndSortedConversations.length,
      unread: unreadConversations,
      totalUnread: totalUnreadCount, // Use the accurate total unread count
      lost: lostStatusConversations,
      unassigned: unassignedConversations
    };
  }, [filteredAndSortedConversations, conversations, totalUnreadCount]);

  // Force refresh global unread count when component mounts
  useEffect(() => {
    const refreshGlobalCount = () => {
      window.dispatchEvent(new CustomEvent('unread-count-changed'));
    };
    const timer = setTimeout(refreshGlobalCount, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Smart Inbox</h3>
          <p className="text-gray-500">Please wait while we load your conversations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <WifiOff className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Connection Error</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <Button onClick={manualRefresh}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">Smart Inbox</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                <Users className="h-3 w-3 mr-1" />
                {stats.total} conversations
              </Badge>
              {(loadingUnreadCount ? stats.unread : stats.totalUnread) > 0 && (
                <Badge variant="destructive">
                  {loadingUnreadCount ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      {stats.unread} unread
                    </>
                  ) : (
                    `${stats.totalUnread} unread`
                  )}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mt-4 flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Button
            variant={hasActiveFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1">
                {getFilterSummary().length}
              </Badge>
            )}
          </Button>

          <Button
            variant={showAISuggestions ? "default" : "outline"}
            onClick={() => setShowAISuggestions(!showAISuggestions)}
            className="flex items-center space-x-2"
          >
            <Brain className="h-4 w-4" />
            <span>AI Assist</span>
          </Button>
        </div>

        {/* AI Response Suggestion Panel - NEW TOP POSITION */}
        {showAISuggestions && selectedConversation && canReply(selectedConversation) && messages.some(m => m.direction === 'in') && (
          <div className="mt-4">
            <AIResponseSuggestionPanel
              selectedConversation={selectedConversation}
              messages={messages}
              onSendMessage={handleSendMessage}
              canReply={canReply(selectedConversation)}
            />
          </div>
        )}

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4">
            <SmartFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={clearFilters}
              userRole={profile?.role}
              conversations={conversations}
              filteredConversations={filteredAndSortedConversations}
              hasActiveFilters={hasActiveFilters}
              filterSummary={getFilterSummary()}
            />
          </div>
        )}

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="mt-3 flex items-center space-x-2">
            <span className="text-sm text-gray-600">Active filters:</span>
            <div className="flex flex-wrap gap-1">
              {getFilterSummary().map((filter, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {filter}
                </Badge>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs h-6 px-2"
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List */}
        <div className="w-80 border-r border-gray-200 bg-white overflow-hidden">
          <InboxConversationsList
            conversations={filteredAndSortedConversations}
            selectedConversationId={selectedConversationId}
            onConversationSelect={handleConversationSelect}
            loading={loading}
            searchQuery={searchQuery}
            onMarkAsRead={markAsRead}
            isMarkingAsRead={isMarkingAsRead}
          />
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex">
          {selectedConversation ? (
            <>
              {/* Conversation View */}
              <div className="flex-1 flex flex-col">
                <ConversationView
                  conversation={selectedConversation}
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  sending={sendingMessage}
                  onMarkAsRead={() => markAsRead(selectedConversation.leadId)}
                  canReply={canReply(selectedConversation)}
                />
              </div>

              {/* Right Sidebar - Lead Context */}
              <div className="w-80 border-l border-gray-200 bg-white">
                <LeadContextPanel
                  conversation={selectedConversation}
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  onScheduleAppointment={() => {}}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a conversation
                </h3>
                <p className="text-gray-500">
                  Choose a conversation from the list to start messaging
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Sorted by newest activity first
                </p>
                {!loadingUnreadCount && stats.totalUnread > stats.unread && (
                  <p className="text-xs text-orange-600 mt-2">
                    Note: {stats.totalUnread - stats.unread} additional unread messages beyond displayed conversations
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConsolidatedSmartInbox;
