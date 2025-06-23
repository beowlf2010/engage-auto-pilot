import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useEnhancedRealtimeInbox } from '@/hooks/useEnhancedRealtimeInbox';
import { useInboxFilters } from '@/hooks/useInboxFilters';
import { useMarkAsRead } from '@/hooks/useMarkAsRead';
import InboxConversationsList from './InboxConversationsList';
import ConversationView from './ConversationView';
import LeadContextPanel from './LeadContextPanel';
import SmartFilters from './SmartFilters';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, MessageSquare, Users, Loader2, WifiOff, Wifi } from 'lucide-react';
import { Input } from '@/components/ui/input';
import ConnectionStatus from './ConnectionStatus';

const SmartInboxWithEnhancedAI = ({ onLeadsRefresh }: { onLeadsRefresh?: () => void }) => {
  const { profile } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  console.log('🔍 [SMART INBOX ENHANCED] Profile data:', {
    id: profile?.id,
    role: profile?.role,
    email: profile?.email
  });

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
    totalConversations,
    loadMessages,
    sendMessage,
    manualRefresh,
    connectionState,
    reconnect,
    isConnected
  } = useEnhancedRealtimeInbox({ onLeadsRefresh });

  const { markAsRead, isMarkingAsRead } = useMarkAsRead();

  // Filter conversations by search and filters
  const filteredConversations = useMemo(() => {
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

    return filtered;
  }, [conversations, searchQuery, applyFilters]);

  const selectedConversation = selectedConversationId 
    ? conversations.find(c => c.leadId === selectedConversationId)
    : null;

  const handleConversationSelect = useCallback(async (conversation: any) => {
    const conversationId = conversation.leadId;
    setSelectedConversationId(conversationId);
    
    console.log('📱 [SMART INBOX] Loading messages for conversation:', conversationId);
    await loadMessages(conversation.leadId);
    
    // Auto-mark as read if there are unread messages
    if (conversation.unreadCount > 0) {
      console.log('📖 [SMART INBOX] Auto-marking conversation as read');
      await markAsRead(conversation.leadId);
    }
  }, [loadMessages, markAsRead]);

  const handleSendMessage = useCallback(async (messageContent: string) => {
    if (!selectedConversation?.leadId) return;
    
    console.log('📤 [SMART INBOX] Sending message via enhanced inbox');
    await sendMessage(selectedConversation.leadId, messageContent);
    
    // Refresh conversations list to update unread counts
    setTimeout(manualRefresh, 500);
  }, [selectedConversation?.leadId, sendMessage, manualRefresh]);

  // Create a wrapper function that matches SmartFilters expected interface
  const handleFiltersChange = useCallback((newFilters: any) => {
    // If it's a complete filter object, replace all filters
    if (typeof newFilters === 'object' && newFilters !== null) {
      Object.keys(newFilters).forEach(key => {
        updateFilter(key as any, newFilters[key]);
      });
    }
  }, [updateFilter]);

  const stats = useMemo(() => {
    const unreadConversations = filteredConversations.filter(c => c.unreadCount > 0).length;
    const lostStatusConversations = conversations.filter(c => c.status === 'lost').length;
    const unassignedConversations = conversations.filter(c => !c.salespersonId).length;
    
    console.log('🔍 [SMART INBOX ENHANCED] UNREAD-FIRST loading stats:', {
      totalConversations: conversations.length,
      filteredConversations: filteredConversations.length,
      unreadConversations,
      lostStatusConversations,
      unassignedConversations,
      isAdmin: profile?.role === 'admin' || profile?.role === 'manager',
      userRole: profile?.role,
      activeFilters: hasActiveFilters,
      searchQuery
    });

    return {
      total: filteredConversations.length,
      unread: unreadConversations,
      lost: lostStatusConversations,
      unassigned: unassignedConversations
    };
  }, [filteredConversations, conversations, profile?.role, hasActiveFilters, searchQuery]);

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
            <Button onClick={manualRefresh}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header with connection status */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">Smart Inbox</h1>
            <ConnectionStatus 
              isConnected={isConnected}
              connectionState={connectionState}
              onReconnect={reconnect}
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                <Users className="h-3 w-3 mr-1" />
                {stats.total} conversations
              </Badge>
              {stats.unread > 0 && (
                <Badge variant="destructive">
                  {stats.unread} unread
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
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4">
            <SmartFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={clearFilters}
              userRole={profile?.role}
              stats={stats}
              conversations={conversations}
              filteredConversations={filteredConversations}
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
            conversations={filteredConversations}
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
              <div className="flex-1">
                <ConversationView
                  conversation={selectedConversation}
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  sending={sendingMessage}
                  onMarkAsRead={() => markAsRead(selectedConversation.leadId)}
                  canReply={true}
                />
              </div>

              {/* Right Sidebar - Lead Context */}
              <div className="w-80 border-l border-gray-200 bg-white">
                <LeadContextPanel
                  conversation={selectedConversation}
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  onScheduleAppointment={() => setShowScheduleModal(true)}
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartInboxWithEnhancedAI;
