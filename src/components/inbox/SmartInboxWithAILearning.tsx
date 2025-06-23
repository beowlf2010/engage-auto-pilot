import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSimplifiedRealtimeInbox } from '@/hooks/useSimplifiedRealtimeInbox';
import { useAuth } from '@/components/auth/AuthProvider';
import { useMarkAsRead } from '@/hooks/useMarkAsRead';
import { useAutoAIResponses } from '@/hooks/useAutoAIResponses';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, Users, Clock, Brain, Filter, Search } from 'lucide-react';
import EnhancedConversationListItem from './EnhancedConversationListItem';
import EnhancedMessageBubble from './EnhancedMessageBubble';
import InventoryAwareMessageInput from './InventoryAwareMessageInput';
import SimpleConnectionStatus from './SimpleConnectionStatus';
import LeadContextPanel from './LeadContextPanel';
import UnifiedSearchBar from './UnifiedSearchBar';
import QuickFilters from './QuickFilters';
import MessageDirectionFilter from './MessageDirectionFilter';
import AIResponseIndicator from './AIResponseIndicator';
import AIResponsePreview from './AIResponsePreview';
import { ConversationListItem, MessageData } from '@/types/conversation';
import { toast } from '@/hooks/use-toast';

interface SmartInboxWithAILearningProps {
  user: { role: string; id: string };
  onLeadsRefresh?: () => void;
}

const SmartInboxWithAILearning: React.FC<SmartInboxWithAILearningProps> = ({ 
  user, 
  onLeadsRefresh 
}) => {
  const { profile } = useAuth();
  const { markAsRead, isMarkingAsRead } = useMarkAsRead();
  const [selectedConversation, setSelectedConversation] = useState<ConversationListItem | null>(null);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [messageFilter, setMessageFilter] = useState<'all' | 'inbound' | 'sent' | 'unread'>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const {
    conversations,
    messages,
    loading,
    sendingMessage,
    connectionState,
    loadMessages,
    sendMessage,
    retryMessage,
    manualRefresh
  } = useSimplifiedRealtimeInbox({ onLeadsRefresh });

  // Initialize auto AI responses
  const { manualTrigger: triggerAIResponse, isProcessing: aiProcessing } = useAutoAIResponses({
    profileId: user.id,
    onResponseGenerated: (leadId, response) => {
      console.log('🤖 AI response generated for lead:', leadId);
      // Refresh messages if this is the selected conversation
      if (selectedConversation?.leadId === leadId) {
        loadMessages(leadId);
      }
      // Refresh conversations to update last message
      manualRefresh();
    }
  });

  // Add AI response preview handling
  const { manualTrigger } = useAutoAIResponses({
    profileId: user.id,
    onResponsePreview: (leadId: string, preview: any) => {
      setAiResponsePreviews(prev => ({
        ...prev,
        [leadId]: preview
      }));
    }
  });

  // Filter conversations based on search and filters
  const filteredConversations = useMemo(() => {
    let filtered = [...conversations];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(conv => 
        conv.leadName.toLowerCase().includes(query) ||
        conv.vehicleInterest.toLowerCase().includes(query) ||
        conv.leadPhone.includes(query)
      );
    }

    // Apply message direction filter
    switch (messageFilter) {
      case 'unread':
        filtered = filtered.filter(conv => conv.unreadCount > 0);
        break;
      case 'inbound':
        // Show conversations with recent inbound messages
        break;
      case 'sent':
        // Show conversations with recent outbound messages
        break;
    }

    // Apply quick filters
    if (activeFilters.has('urgent')) {
      filtered = filtered.filter(conv => conv.unreadCount > 3);
    }
    if (activeFilters.has('unread')) {
      filtered = filtered.filter(conv => conv.unreadCount > 0);
    }
    if (activeFilters.has('recent')) {
      // Filter for conversations with activity in last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      // This would need more sophisticated filtering based on actual timestamps
    }

    return filtered;
  }, [conversations, searchQuery, messageFilter, activeFilters]);

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    const unreadCount = conversations.filter(c => c.unreadCount > 0).length;
    const urgentCount = conversations.filter(c => c.unreadCount > 3).length;
    
    return {
      total: conversations.length,
      unread: unreadCount,
      urgent: urgentCount,
      inbound: 0, // Would need message direction analysis
      sent: 0 // Would need message direction analysis
    };
  }, [conversations]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.trim() && !recentSearches.includes(query)) {
      setRecentSearches(prev => [query, ...prev.slice(0, 4)]);
    }
  }, [recentSearches]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // Handle quick filters
  const handleFilterToggle = useCallback((filterId: string) => {
    setActiveFilters(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(filterId)) {
        newFilters.delete(filterId);
      } else {
        newFilters.add(filterId);
      }
      return newFilters;
    });
  }, []);

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

  const handleMarkAsRead = useCallback(async (leadId: string) => {
    await markAsRead(leadId);
    // Refresh conversations to update unread counts
    manualRefresh();
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

  // Check if current conversation needs AI response
  const needsAIResponse = useMemo(() => {
    if (!selectedConversation || !conversationMessages.length) return false;
    
    const lastMessage = conversationMessages[conversationMessages.length - 1];
    const hasUnreadInbound = conversationMessages.some(msg => 
      msg.direction === 'in' && !msg.readAt
    );
    
    return lastMessage?.direction === 'in' && hasUnreadInbound;
  }, [selectedConversation, conversationMessages]);

  const handleTriggerAI = useCallback(() => {
    if (selectedConversation) {
      triggerAIResponse(selectedConversation.leadId);
    }
  }, [selectedConversation, triggerAIResponse]);

  const [aiResponsePreviews, setAiResponsePreviews] = useState<Record<string, any>>({});

  const handleDismissPreview = (leadId: string) => {
    setAiResponsePreviews(prev => {
      const updated = { ...prev };
      delete updated[leadId];
      return updated;
    });
  };

  const handlePreviewSent = (leadId: string) => {
    handleDismissPreview(leadId);
    if (selectedConversation?.leadId === leadId) {
      loadMessages(leadId);
    }
    manualRefresh();
    onLeadsRefresh?.();
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-gray-50">
      {/* Left Sidebar - Conversations List */}
      <div className="w-1/3 border-r bg-white flex flex-col">
        {/* Header with Search and Filters */}
        <div className="p-4 border-b bg-white space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Smart Inbox</h2>
              <Badge variant="outline" className="bg-purple-100 text-purple-700">
                <Brain className="h-3 w-3 mr-1" />
                AI Enhanced
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <AIResponseIndicator isGenerating={aiProcessing} />
              <SimpleConnectionStatus 
                connectionState={connectionState} 
                onReconnect={manualRefresh}
                onForceSync={manualRefresh}
              />
            </div>
          </div>

          {/* Search Bar */}
          <UnifiedSearchBar
            searchQuery={searchQuery}
            onSearch={handleSearch}
            onClearSearch={handleClearSearch}
            recentSearches={recentSearches}
            searchResultsCount={filteredConversations.length}
          />

          {/* Quick Filters */}
          <QuickFilters
            activeFilters={activeFilters}
            onFilterToggle={handleFilterToggle}
            urgentCount={filterCounts.urgent}
            unreadCount={filterCounts.unread}
          />

          {/* Message Direction Filter */}
          <MessageDirectionFilter
            activeFilter={messageFilter}
            onFilterChange={setMessageFilter}
            inboundCount={filterCounts.inbound}
            sentCount={filterCounts.sent}
            totalCount={filterCounts.total}
            unreadCount={filterCounts.unread}
            type="conversations"
          />

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{filteredConversations.length} conversations</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Real-time updates</span>
            </div>
          </div>
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
              {(searchQuery || activeFilters.size > 0) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setSearchQuery('');
                    setActiveFilters(new Set());
                    setMessageFilter('all');
                  }}
                  className="mt-2"
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
                  {needsAIResponse && (
                    <AIResponseIndicator
                      isGenerating={aiProcessing}
                      onManualTrigger={handleTriggerAI}
                      canTrigger={!aiProcessing}
                    />
                  )}
                  {selectedConversation.unreadCount > 0 && (
                    <Badge variant="destructive">
                      {selectedConversation.unreadCount} unread
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {selectedConversation.status}
                  </Badge>
                  {connectionState.isConnected ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      {connectionState.status}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* AI Response Preview */}
            {aiResponsePreviews[selectedConversation.leadId] && (
              <div className="p-4 border-b bg-white">
                <AIResponsePreview
                  leadId={selectedConversation.leadId}
                  preview={aiResponsePreviews[selectedConversation.leadId]}
                  profileId={user.id}
                  onSent={() => handlePreviewSent(selectedConversation.leadId)}
                  onDismiss={() => handleDismissPreview(selectedConversation.leadId)}
                  onFeedback={(feedback, notes) => {
                    console.log('AI Response feedback:', feedback, notes);
                    // Could capture this feedback for learning
                  }}
                />
              </div>
            )}

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
              <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                <Brain className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <p className="text-sm text-purple-700">
                  Finn will automatically respond to new customer messages
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - Lead Context Panel */}
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

export default SmartInboxWithAILearning;
