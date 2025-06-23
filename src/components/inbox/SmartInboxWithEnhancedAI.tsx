
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useEnhancedRealtimeInbox } from '@/hooks/useEnhancedRealtimeInbox';
import { useOptimizedInbox } from '@/hooks/useOptimizedInbox';
import { useInboxFilters } from '@/hooks/useInboxFilters';
import { useMarkAsRead } from '@/hooks/useMarkAsRead';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { MessageCircle, Users, Clock, Zap, Brain, Sparkles, Search } from 'lucide-react';
import EnhancedConversationListItem from './EnhancedConversationListItem';
import EnhancedMessageBubble from './EnhancedMessageBubble';
import InventoryAwareMessageInput from './InventoryAwareMessageInput';
import ConnectionStatusIndicator from './ConnectionStatusIndicator';
import LeadContextPanel from './LeadContextPanel';
import SmartFilters from './SmartFilters';
import FilterStatusBanner from './FilterStatusBanner';
import { ConversationListItem, MessageData } from '@/types/conversation';
import { toast } from '@/hooks/use-toast';
import { useEnhancedConnectionManager } from '@/hooks/useEnhancedConnectionManager';

interface SmartInboxWithEnhancedAIProps {
  onLeadsRefresh?: () => void;
}

const SmartInboxWithEnhancedAI: React.FC<SmartInboxWithEnhancedAIProps> = ({ onLeadsRefresh }) => {
  const { profile } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<ConversationListItem | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Debug logging for profile data
  console.log('🔍 [SMART INBOX ENHANCED] Profile data:', {
    id: profile?.id,
    role: profile?.role,
    email: profile?.email
  });

  // Use the optimized inbox hook with proper role information
  const {
    conversations: allConversations,
    messages,
    loading,
    sendingMessage,
    loadMessages,
    sendMessage,
    manualRefresh
  } = useOptimizedInbox({ 
    onLeadsRefresh,
    userRole: profile?.role,
    profileId: profile?.id
  });

  // Initialize filters hook
  const {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    applyFilters,
    getFilterSummary
  } = useInboxFilters(profile?.id, profile?.role);

  // Mark as read functionality
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
    let filtered = applyFilters(allConversations);
    
    // Apply search filter
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(conv => 
        conv.leadName.toLowerCase().includes(searchLower) ||
        conv.vehicleInterest.toLowerCase().includes(searchLower) ||
        conv.leadPhone.includes(searchQuery)
      );
    }
    
    return filtered;
  }, [allConversations, applyFilters, searchQuery]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.leadId);
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
    console.log('🔍 [SMART INBOX ENHANCED] Selecting conversation:', conversation.leadName);
    setSelectedConversation(conversation);
  }, []);

  const handleMarkAsRead = useCallback(async (leadId: string) => {
    try {
      await markAsRead(leadId);
      // Refresh conversations to update unread counts
      manualRefresh();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }, [markAsRead, manualRefresh]);

  const canReply = useMemo(() => {
    return selectedConversation && 
           (selectedConversation.salespersonId === profile?.id || 
            selectedConversation.salespersonId === null);
  }, [selectedConversation, profile?.id]);

  const conversationMessages = useMemo(() => {
    return messages.map(msg => ({
      ...msg,
      leadName: selectedConversation?.leadName || '',
      vehicleInterest: selectedConversation?.vehicleInterest || ''
    }));
  }, [messages, selectedConversation]);

  // Enhanced debug information for admin users
  const unreadConversations = allConversations.filter(c => c.unreadCount > 0);
  const lostStatusConversations = allConversations.filter(c => c.status === 'lost');
  const unassignedConversations = allConversations.filter(c => !c.salespersonId);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager';

  console.log('🔍 [SMART INBOX ENHANCED] UNREAD-FIRST loading stats:', {
    totalConversations: allConversations.length,
    filteredConversations: filteredConversations.length,
    unreadConversations: unreadConversations.length,
    lostStatusConversations: lostStatusConversations.length,
    unassignedConversations: unassignedConversations.length,
    isAdmin,
    userRole: profile?.role,
    activeFilters: hasActiveFilters,
    searchQuery: searchQuery.trim()
  });

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-gray-50">
      {/* Left Sidebar - Conversations List */}
      <div className="w-1/3 border-r bg-white flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Smart Inbox</h2>
              <Badge variant="outline" className="bg-purple-100 text-purple-700">
                <Brain className="h-3 w-3 mr-1" />
                AI Enhanced
              </Badge>
              {isAdmin && (
                <Badge variant="outline" className="bg-green-100 text-green-700">
                  Admin View
                </Badge>
              )}
            </div>
            <ConnectionStatusIndicator 
              connectionState={connectionState} 
              onReconnect={forceReconnect}
              onForceSync={forceSync}
            />
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{allConversations.length} total</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="h-4 w-4" />
              <span>Unread-first loading</span>
            </div>
          </div>

          {/* Enhanced debug information for admin users */}
          {isAdmin && (
            <div className="mt-2 text-xs text-gray-500 space-y-1">
              <div>🔍 Loaded: {allConversations.length} total, {unreadConversations.length} unread, {lostStatusConversations.length} lost, {unassignedConversations.length} unassigned</div>
              <div>👤 Role: {profile?.role}, ID: {profile?.id?.slice(0, 8)}...</div>
              <div>⚡ Strategy: Unread messages loaded first, then recent conversations</div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="p-4 border-b">
          <SmartFilters
            filters={filters}
            onFiltersChange={(newFilters) => {
              Object.keys(newFilters).forEach(key => {
                updateFilter(key as any, newFilters[key]);
              });
            }}
            conversations={allConversations}
            filteredConversations={filteredConversations}
            hasActiveFilters={hasActiveFilters}
            filterSummary={getFilterSummary()}
            onClearFilters={clearFilters}
            userRole={profile?.role}
          />
        </div>

        {/* Filter Status Banner */}
        <FilterStatusBanner
          hasActiveFilters={hasActiveFilters || searchQuery.trim() !== ''}
          filterSummary={[
            ...getFilterSummary(),
            ...(searchQuery.trim() ? [`Search: "${searchQuery}"`] : [])
          ]}
          hiddenCount={allConversations.length - filteredConversations.length}
          totalCount={allConversations.length}
          onClearFilters={() => {
            clearFilters();
            setSearchQuery('');
          }}
          userRole={profile?.role}
        />

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>{allConversations.length === 0 ? 'No conversations found' : 'No conversations match your filters'}</p>
              {isAdmin && (
                <p className="text-xs mt-2">Admin: Including all statuses and assignments with unread-first loading</p>
              )}
            </div>
          ) : (
            <>
              {/* Show specific leads we're looking for in debug */}
              {isAdmin && (
                <div className="p-2 bg-green-50 text-xs text-green-800 border-b">
                  ⚡ UNREAD-FIRST LOADING: Steven Wood ({allConversations.find(c => c.leadName.toLowerCase().includes('steven') && c.leadName.toLowerCase().includes('wood')) ? '✅ Loaded' : '❌ Missing'})
                  , Jackson Caldwell ({allConversations.find(c => c.leadName.toLowerCase().includes('jackson') && c.leadName.toLowerCase().includes('caldwell')) ? '✅ Loaded' : '❌ Missing'})
                </div>
              )}
              {filteredConversations.map((conversation) => (
                <EnhancedConversationListItem
                  key={conversation.leadId}
                  conversation={conversation}
                  isSelected={selectedConversation?.leadId === conversation.leadId}
                  onSelect={() => handleConversationSelect(conversation)}
                  canReply={canReply || false}
                  markAsRead={handleMarkAsRead}
                  isMarkingAsRead={isMarkingAsRead}
                />
              ))}
            </>
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
                  {!selectedConversation.salespersonId && (
                    <Badge variant="secondary">
                      Unassigned
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
                  onRetry={message.smsStatus === 'failed' ? () => console.log('Retry message:', message.id) : undefined}
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
              {isAdmin && (
                <div className="text-xs mt-2 text-blue-600 space-y-1">
                  <p>Admin: You can see all conversations including unassigned and lost leads</p>
                  <p>⚡ Unread messages are loaded first for immediate visibility</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - Lead Context Panel with AI Integration */}
      {selectedConversation && (
        <div className="w-80 border-l bg-white">
          <LeadContextPanel
            conversation={selectedConversation}
            onScheduleAppointment={() => {
              console.log('Schedule appointment for:', selectedConversation.leadName);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default SmartInboxWithEnhancedAI;
