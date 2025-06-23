
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useEnhancedRealtimeInbox } from '@/hooks/useEnhancedRealtimeInbox';
import { useMessageFiltering } from './useMessageFiltering';
import { useAuth } from '@/components/auth/AuthProvider';
import { useMarkAsRead } from '@/hooks/inbox/useMarkAsRead';
import { useDebouncedRefresh } from '@/hooks/useDebouncedRefresh';
import { useOptimisticUnreadCounts } from '@/hooks/useOptimisticUnreadCounts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, Users, Clock, Zap, Brain, Sparkles, Send, Calendar } from 'lucide-react';
import EnhancedConversationListItem from './EnhancedConversationListItem';
import EnhancedMessageBubble from './EnhancedMessageBubble';
import InventoryAwareMessageInput from './InventoryAwareMessageInput';
import ConnectionStatusIndicator from './ConnectionStatusIndicator';
import IntelligentAIPanel from './IntelligentAIPanel';
import ChatAIPanelsContainer from './ChatAIPanelsContainer';
import MessageDirectionFilter from './MessageDirectionFilter';
import { ConversationListItem, MessageData } from '@/types/conversation';
import { toast } from '@/hooks/use-toast';
import { useEnhancedConnectionManager } from '@/hooks/useEnhancedConnectionManager';

interface SmartInboxWithAILearningProps {
  user: {
    id: string;
    role: string;
  };
  onLeadsRefresh?: () => void;
}

const SmartInboxWithAILearning: React.FC<SmartInboxWithAILearningProps> = ({ user, onLeadsRefresh }) => {
  const { profile } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<ConversationListItem | null>(null);
  const [messageText, setMessageText] = useState('');
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  
  const autoSelectionCooldownRef = useRef<NodeJS.Timeout | null>(null);
  const lastSelectedLeadRef = useRef<string | null>(null);

  const {
    conversations,
    messages,
    loading,
    sendingMessage,
    loadMessages,
    sendMessage: baseSendMessage,
    retryMessage,
    manualRefresh: baseManualRefresh
  } = useEnhancedRealtimeInbox({ onLeadsRefresh });

  // Enhanced connection manager
  const { connectionState, forceReconnect, forceSync } = useEnhancedConnectionManager({
    onMessageUpdate: (leadId: string) => {
      if (selectedConversation?.leadId === leadId) {
        loadMessages(leadId);
      }
    },
    onConversationUpdate: baseManualRefresh,
    onUnreadCountUpdate: baseManualRefresh
  });

  // Debounced refresh to prevent cascading calls
  const { debouncedRefresh } = useDebouncedRefresh(baseManualRefresh, 300);

  // Optimistic unread count management
  const {
    markAsReadOptimistically,
    getEffectiveUnreadCount,
    clearOptimisticCount,
    isMarking
  } = useOptimisticUnreadCounts();

  // Message filtering
  const {
    conversationFilter,
    setConversationFilter,
    getFilteredConversations,
    getConversationCounts
  } = useMessageFiltering();

  // Mark as read functionality
  const { markAsRead, markingAsRead } = useMarkAsRead(debouncedRefresh);

  // Get filtered conversations with optimistic unread counts
  const conversationsWithOptimisticCounts = useMemo(() => {
    return conversations.map(conv => ({
      ...conv,
      unreadCount: getEffectiveUnreadCount(conv)
    }));
  }, [conversations, getEffectiveUnreadCount]);

  const filteredConversations = useMemo(() => {
    return getFilteredConversations(conversationsWithOptimisticCounts);
  }, [getFilteredConversations, conversationsWithOptimisticCounts]);

  const conversationCounts = useMemo(() => {
    return getConversationCounts(conversationsWithOptimisticCounts);
  }, [getConversationCounts, conversationsWithOptimisticCounts]);

  // Enhanced send message with optimistic mark-as-read
  const sendMessage = useCallback(async (messageContent: string) => {
    if (!selectedConversation || !messageContent.trim()) return;

    try {
      // Optimistically mark as read when sending a message
      if (selectedConversation.unreadCount > 0) {
        const shouldMarkAsRead = markAsReadOptimistically(selectedConversation.leadId);
        if (shouldMarkAsRead) {
          // Perform actual mark as read in background
          setTimeout(() => {
            markAsRead(selectedConversation.leadId);
          }, 100);
        }
      }

      await baseSendMessage(selectedConversation.leadId, messageContent.trim());
      setMessageText('');
      
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully",
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Clear optimistic update on error
      clearOptimisticCount(selectedConversation.leadId);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive"
      });
    }
  }, [selectedConversation, baseSendMessage, markAsReadOptimistically, markAsRead, clearOptimisticCount]);

  // Enhanced conversation selection with auto mark-as-read
  const handleConversationSelect = useCallback(async (conversation: ConversationListItem) => {
    // Prevent rapid selection changes during auto-selection cooldown
    if (autoSelectionCooldownRef.current && lastSelectedLeadRef.current !== conversation.leadId) {
      return;
    }

    setSelectedConversation(conversation);
    lastSelectedLeadRef.current = conversation.leadId;

    // Auto mark as read with optimistic update
    if (conversation.unreadCount > 0) {
      const shouldMarkAsRead = markAsReadOptimistically(conversation.leadId);
      if (shouldMarkAsRead) {
        // Perform actual mark as read in background
        setTimeout(() => {
          markAsRead(conversation.leadId);
        }, 100);
      }
    }

    // Set cooldown to prevent auto-selection loops
    if (autoSelectionCooldownRef.current) {
      clearTimeout(autoSelectionCooldownRef.current);
    }
    autoSelectionCooldownRef.current = setTimeout(() => {
      autoSelectionCooldownRef.current = null;
    }, 1000);
  }, [markAsReadOptimistically, markAsRead]);

  // Auto-selection logic for unread filter (with loop prevention)
  useEffect(() => {
    if (conversationFilter === 'unread' && selectedConversation && !autoSelectionCooldownRef.current) {
      const currentSelectedUnreadCount = getEffectiveUnreadCount(selectedConversation);
      
      // If current conversation has no unread messages, find next unread
      if (currentSelectedUnreadCount === 0) {
        const nextUnreadConversation = filteredConversations.find(conv => 
          conv.leadId !== selectedConversation.leadId && getEffectiveUnreadCount(conv) > 0
        );

        if (nextUnreadConversation) {
          console.log('🔄 Auto-selecting next unread conversation:', nextUnreadConversation.leadName);
          handleConversationSelect(nextUnreadConversation);
        }
      }
    }
  }, [conversationFilter, selectedConversation, filteredConversations, getEffectiveUnreadCount, handleConversationSelect]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.leadId);
    }
  }, [selectedConversation, loadMessages]);

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

  // Cleanup auto-selection timeout
  useEffect(() => {
    return () => {
      if (autoSelectionCooldownRef.current) {
        clearTimeout(autoSelectionCooldownRef.current);
      }
    };
  }, []);

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
            </div>
            <ConnectionStatusIndicator 
              connectionState={connectionState} 
              onReconnect={forceReconnect}
              onForceSync={forceSync}
            />
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{conversations.length} conversations</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Real-time updates</span>
            </div>
          </div>
        </div>

        {/* Message Direction Filters */}
        <div className="p-4">
          <MessageDirectionFilter
            activeFilter={conversationFilter}
            onFilterChange={setConversationFilter}
            inboundCount={conversationCounts.inboundCount}
            sentCount={conversationCounts.sentCount}
            totalCount={conversationCounts.totalCount}
            unreadCount={conversationCounts.unreadCount}
            type="conversations"
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
              {conversationFilter !== 'all' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setConversationFilter('all')}
                  className="mt-2"
                >
                  Show All Conversations
                </Button>
              )}
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <EnhancedConversationListItem
                key={conversation.leadId}
                conversation={{
                  ...conversation,
                  unreadCount: getEffectiveUnreadCount(conversation)
                }}
                isSelected={selectedConversation?.leadId === conversation.leadId}
                onSelect={() => handleConversationSelect(conversation)}
                canReply={canReply || false}
                markAsRead={markAsRead}
                isMarkingAsRead={isMarking(conversation.leadId) || markingAsRead === conversation.leadId}
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
                  {getEffectiveUnreadCount(selectedConversation) > 0 && (
                    <Badge variant="destructive">
                      {getEffectiveUnreadCount(selectedConversation)} unread
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {selectedConversation.status}
                  </Badge>
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
                  onSendMessage={sendMessage}
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

      {/* Right Sidebar - AI Panels */}
      {selectedConversation && (
        <div className="w-80 border-l bg-white flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold">AI Assistant</h3>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Intelligent AI Panel - Main Feature */}
            <IntelligentAIPanel
              conversation={selectedConversation}
              messages={conversationMessages}
              onSendMessage={sendMessage}
              canReply={canReply || false}
              isCollapsed={!showAIPanel}
              onToggleCollapse={() => setShowAIPanel(!showAIPanel)}
            />

            <Separator />

            {/* Additional AI Panels */}
            <ChatAIPanelsContainer
              showAnalysis={showAnalysis}
              showAIPanel={false}
              showAIGenerator={showAIGenerator}
              canReply={canReply || false}
              selectedConversation={selectedConversation}
              messages={conversationMessages}
              onSummaryUpdate={() => {}}
              onSelectSuggestion={sendMessage}
              onToggleAIPanel={() => setShowAIPanel(!showAIPanel)}
              onSendAIMessage={sendMessage}
              onCloseAIGenerator={() => setShowAIGenerator(false)}
            />

            {/* AI Panel Controls */}
            <Card>
              <CardContent className="p-3">
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAnalysis(!showAnalysis)}
                    className="justify-start"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    {showAnalysis ? 'Hide' : 'Show'} Analysis
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAIGenerator(!showAIGenerator)}
                    className="justify-start"
                    disabled={!canReply}
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    AI Message Generator
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartInboxWithAILearning;
