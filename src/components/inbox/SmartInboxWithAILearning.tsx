
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOptimizedInbox } from '@/hooks/useOptimizedInbox';
import { useInboxFilters } from '@/hooks/useInboxFilters';
import { useRealtimeLearning } from '@/hooks/useRealtimeLearning';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { MessageCircle, Users, Clock, Search, Filter, X, RefreshCw, Inbox, MessageSquare, User, Brain, Sparkles } from 'lucide-react';
import EnhancedConversationListItem from './EnhancedConversationListItem';
import EnhancedMessageBubble from './EnhancedMessageBubble';
import InventoryAwareMessageInput from './InventoryAwareMessageInput';
import ConnectionStatusIndicator from './ConnectionStatusIndicator';
import LeadContextPanel from './LeadContextPanel';
import AILearningInsightsPanel from './AILearningInsightsPanel';
import { ConversationListItem } from '@/types/conversation';
import { toast } from '@/hooks/use-toast';

interface SmartInboxWithAILearningProps {
  onLeadsRefresh?: () => void;
  user?: {
    id: string;
    role: string;
  };
}

const SmartInboxWithAILearning: React.FC<SmartInboxWithAILearningProps> = ({ onLeadsRefresh, user }) => {
  const { profile } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<ConversationListItem | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Use the updated hooks
  const {
    conversations,
    messages,
    loading,
    error,
    sendingMessage,
    totalConversations,
    loadConversations,
    loadMessages,
    sendMessage,
    manualRefresh,
    setError
  } = useOptimizedInbox({
    onLeadsRefresh
  });

  const {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    applyFilters
  } = useInboxFilters(profile?.id);

  // NEW: AI Learning Integration
  const {
    learningInsights,
    optimizationQueue,
    loading: learningLoading,
    isLearning,
    trackMessageOutcome,
    processOptimizationQueue,
    submitRealtimeFeedback,
    trackResponseReceived
  } = useRealtimeLearning(selectedConversation?.leadId);

  // Apply filters to conversations
  const filteredConversations = useMemo(() => {
    let filtered = conversations;
    
    // Apply search first
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(conv => 
        conv.leadName.toLowerCase().includes(searchLower) ||
        conv.vehicleInterest.toLowerCase().includes(searchLower) ||
        conv.leadPhone.includes(searchQuery)
      );
    }
    
    // Then apply other filters
    return applyFilters(filtered);
  }, [conversations, searchQuery, applyFilters]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.leadId);
    }
  }, [selectedConversation, loadMessages]);

  // Update search filter when query changes
  useEffect(() => {
    updateFilter('search', searchQuery);
  }, [searchQuery, updateFilter]);

  // NEW: Track when responses are received
  useEffect(() => {
    if (selectedConversation && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.direction === 'in') {
        // Customer responded - track it for learning
        const messageTime = new Date(lastMessage.sentAt);
        const now = new Date();
        const responseTimeHours = (now.getTime() - messageTime.getTime()) / (1000 * 60 * 60);
        trackResponseReceived(responseTimeHours);
      }
    }
  }, [messages, selectedConversation, trackResponseReceived]);

  const handleSendMessage = useCallback(async (messageContent: string) => {
    if (!selectedConversation || !messageContent.trim()) return;

    try {
      await sendMessage(selectedConversation.leadId, messageContent.trim());
      setMessageText('');
      
      // NEW: Track message outcome for AI learning
      await trackMessageOutcome(messageContent.trim(), 'message_sent');
      
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
  }, [selectedConversation, sendMessage, trackMessageOutcome]);

  // NEW: Handle message feedback for AI learning
  const handleMessageFeedback = useCallback(async (
    messageContent: string,
    feedbackType: 'positive' | 'negative' | 'neutral',
    rating?: number,
    suggestions?: string
  ) => {
    if (!selectedConversation) return;
    
    try {
      await submitRealtimeFeedback(messageContent, feedbackType, rating, suggestions);
      toast({
        title: "Feedback Submitted",
        description: "Your feedback helps improve AI responses",
      });
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  }, [selectedConversation, submitRealtimeFeedback]);

  const handleConversationSelect = useCallback((conversation: ConversationListItem) => {
    setSelectedConversation(conversation);
  }, []);

  const canReply = useMemo(() => {
    return selectedConversation && 
           (selectedConversation.salespersonId === profile?.id || 
            selectedConversation.salespersonId === null);
  }, [selectedConversation, profile?.id]);

  const handleRefresh = useCallback(() => {
    manualRefresh();
    if (onLeadsRefresh) {
      onLeadsRefresh();
    }
  }, [manualRefresh, onLeadsRefresh]);

  const handleClearFilters = useCallback(() => {
    clearFilters();
    setSearchQuery('');
  }, [clearFilters]);

  // Quick filter handlers
  const handleUnreadFilter = useCallback(() => {
    updateFilter('unreadOnly', !filters.unreadOnly);
  }, [filters.unreadOnly, updateFilter]);

  const handleMyLeadsFilter = useCallback(() => {
    updateFilter('myLeadsOnly', !filters.myLeadsOnly);
  }, [filters.myLeadsOnly, updateFilter]);

  const handleUnrepliedInboundFilter = useCallback(() => {
    updateFilter('unrepliedInboundOnly', !filters.unrepliedInboundOnly);
  }, [filters.unrepliedInboundOnly, updateFilter]);

  // Calculate stats
  const unreadCount = conversations.filter(c => c.unreadCount > 0).length;
  const myLeadsCount = conversations.filter(c => c.salespersonId === profile?.id).length;
  const unrepliedInboundCount = conversations.filter(c => c.hasUnrepliedInbound).length;

  // Mock functions to satisfy EnhancedConversationListItem props
  const mockMarkAsRead = async (leadId: string) => {
    console.log('Mark as read:', leadId);
  };

  if (error) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-medium mb-2">Error Loading Inbox</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => setError(null)} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              <Badge variant="outline" className="bg-green-100 text-green-700">
                <Brain className="h-3 w-3 mr-1" />
                AI Learning
              </Badge>
              {isLearning && (
                <Badge variant="outline" className="bg-purple-100 text-purple-700 animate-pulse">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Learning
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant={filters.unreadOnly ? "default" : "outline"}
              size="sm"
              onClick={handleUnreadFilter}
              className="flex items-center gap-1"
            >
              <Inbox className="h-3 w-3" />
              Unread ({unreadCount})
            </Button>
            
            <Button
              variant={filters.unrepliedInboundOnly ? "default" : "outline"}
              size="sm"
              onClick={handleUnrepliedInboundFilter}
              className="flex items-center gap-1"
            >
              <MessageSquare className="h-3 w-3" />
              Unreplied ({unrepliedInboundCount})
            </Button>
            
            <Button
              variant={filters.myLeadsOnly ? "default" : "outline"}
              size="sm"
              onClick={handleMyLeadsFilter}
              className="flex items-center gap-1"
            >
              <User className="h-3 w-3" />
              My Leads ({myLeadsCount})
            </Button>
          </div>

          {/* Active Filters & Clear */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Filters active</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Clear
              </Button>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{filteredConversations.length} of {totalConversations}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Real-time</span>
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
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
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
                markAsRead={mockMarkAsRead}
                isMarkingAsRead={false}
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
                  {selectedConversation.hasUnrepliedInbound && (
                    <Badge variant="outline" className="bg-orange-100 text-orange-700">
                      Needs Reply
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {selectedConversation.status}
                  </Badge>
                  {learningInsights && (
                    <Badge variant="outline" className="bg-purple-100 text-purple-700">
                      <Brain className="h-3 w-3 mr-1" />
                      AI Active
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <EnhancedMessageBubble
                  key={message.id}
                  message={{
                    ...message,
                    leadName: selectedConversation.leadName,
                    vehicleInterest: selectedConversation.vehicleInterest
                  }}
                  onFeedback={handleMessageFeedback}
                />
              ))}
            </div>

            {/* Message Input */}
            {canReply && (
              <div className="p-4 border-t bg-white">
                <InventoryAwareMessageInput
                  leadId={selectedConversation.leadId}
                  conversationHistory={messages.map(m => `${m.direction === 'in' ? 'Customer' : 'Sales'}: ${m.body}`).join('\n')}
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

      {/* Right Sidebar - Lead Context Panel with AI Learning */}
      {selectedConversation && (
        <div className="w-80 border-l bg-white flex flex-col">
          <LeadContextPanel
            conversation={selectedConversation}
            onScheduleAppointment={() => {
              console.log('Schedule appointment for:', selectedConversation.leadName);
            }}
          />
          
          {/* AI Learning Insights Panel */}
          <div className="border-t">
            <AILearningInsightsPanel
              leadId={selectedConversation.leadId}
              insights={learningInsights}
              optimizationQueue={optimizationQueue}
              isLearning={isLearning}
              onProcessOptimizations={processOptimizationQueue}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartInboxWithAILearning;
