import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useEnhancedRealtimeInbox } from '@/hooks/useEnhancedRealtimeInbox';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, Users, Clock, Zap, Brain, Sparkles } from 'lucide-react';
import EnhancedConversationListItem from './EnhancedConversationListItem';
import EnhancedMessageBubble from './EnhancedMessageBubble';
import InventoryAwareMessageInput from './InventoryAwareMessageInput';
import ConnectionStatusIndicator from './ConnectionStatusIndicator';
import IntelligentAIPanel from './IntelligentAIPanel';
import ChatAIPanelsContainer from './ChatAIPanelsContainer';
import { ConversationListItem, MessageData } from '@/types/conversation';
import { toast } from '@/hooks/use-toast';
import MessageDirectionFilter from './MessageDirectionFilter';
import CollapsibleAIPanels from './CollapsibleAIPanels';
import AIResponseSuggestionPanel from './AIResponseSuggestionPanel';
import AIEmergencyToggle from '@/components/ai/AIEmergencyToggle';

interface SmartInboxWithAILearningProps {
  user: {
    id: string;
    role: string;
  };
}

const SmartInboxWithAILearning: React.FC<SmartInboxWithAILearningProps> = ({ user }) => {
  const [selectedConversation, setSelectedConversation] = useState<ConversationListItem | null>(null);
  const [messageText, setMessageText] = useState('');
  const [showLearningDashboard, setShowLearningDashboard] = useState(false);
  const [showPredictiveInsights, setShowPredictiveInsights] = useState(false);
  const [conversationFilter, setConversationFilter] = useState<'all' | 'inbound' | 'sent'>('all');
  const [messageFilter, setMessageFilter] = useState<'all' | 'inbound' | 'sent'>('all');
  const [markingAsRead, setMarkingAsRead] = useState<Set<string>>(new Set());

  const {
    conversations,
    messages,
    loading,
    sendingMessage,
    loadMessages,
    sendMessage,
    retryMessage,
    connectionState,
    manualRefresh
  } = useEnhancedRealtimeInbox();

  const totalConversations = conversations.length;
  const unreadCount = conversations.reduce((acc, conv) => acc + conv.unreadCount, 0);

  const filteredConversations = useMemo(() => {
    if (conversationFilter === 'all') {
      return conversations;
    }

    return conversations.filter(conversation => {
      if (conversationFilter === 'inbound') {
        return conversation.lastMessageDirection === 'in';
      } else if (conversationFilter === 'sent') {
        return conversation.lastMessageDirection === 'out';
      }
      return true;
    });
  }, [conversations, conversationFilter]);

  const conversationCounts = useMemo(() => {
    const inboundCount = conversations.filter(conv => conv.lastMessageDirection === 'in').length;
    const sentCount = conversations.filter(conv => conv.lastMessageDirection === 'out').length;
    const totalCount = conversations.length;

    return { inboundCount, sentCount, totalCount };
  }, [conversations]);

  const filteredMessages = useMemo(() => {
    if (messageFilter === 'all') {
      return messages;
    }

    return messages.filter(message => {
      if (messageFilter === 'inbound') {
        return message.direction === 'in';
      } else if (messageFilter === 'sent') {
        return message.direction === 'out';
      }
      return true;
    });
  }, [messages, messageFilter]);

  const messageCounts = useMemo(() => {
    const inboundCount = messages.filter(msg => msg.direction === 'in').length;
    const sentCount = messages.filter(msg => msg.direction === 'out').length;
    const totalCount = messages.length;

    return { inboundCount, sentCount, totalCount };
  }, [messages]);

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
    setSelectedConversation(conversation);
  }, []);

  const canReply = useMemo(() => {
    return selectedConversation &&
      (selectedConversation.salespersonId === user.id ||
        selectedConversation.salespersonId === null);
  }, [selectedConversation, user.id]);

  // Simple mark as read handler without using markConversationAsRead
  const handleMarkAsRead = useCallback(async (leadId: string) => {
    setMarkingAsRead(prev => new Set(prev.add(leadId)));
    try {
      // For now, just refresh manually after a short delay
      setTimeout(() => {
        manualRefresh();
        setMarkingAsRead(prev => {
          const next = new Set(prev);
          next.delete(leadId);
          return next;
        });
      }, 1000);
    } catch (error) {
      console.error('Error marking as read:', error);
      setMarkingAsRead(prev => {
        const next = new Set(prev);
        next.delete(leadId);
        return next;
      });
    }
  }, [manualRefresh]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">Smart Inbox</h1>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Brain className="h-3 w-3 mr-1" />
                AI Enhanced
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{totalConversations} conversations</span>
              </div>
              {unreadCount > 0 && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{unreadCount} unread</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <AIEmergencyToggle userId={user.id} />
            <ConnectionStatusIndicator 
              connectionState={connectionState} 
              onReconnect={() => manualRefresh()}
              className="flex-shrink-0"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar - Conversations */}
        <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
          {/* Conversations Header */}
          <div className="p-4 border-b border-gray-200">
            <MessageDirectionFilter
              activeFilter={conversationFilter}
              onFilterChange={setConversationFilter}
              inboundCount={conversationCounts.inboundCount}
              sentCount={conversationCounts.sentCount}
              totalCount={conversationCounts.totalCount}
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
                  isMarkingAsRead={markingAsRead.has(conversation.leadId)}
                />
              ))
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 bg-white">
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
                  </div>
                </div>

                {/* Message Filter */}
                <div className="mt-4">
                  <MessageDirectionFilter
                    activeFilter={messageFilter}
                    onFilterChange={setMessageFilter}
                    inboundCount={messageCounts.inboundCount}
                    sentCount={messageCounts.sentCount}
                    totalCount={messageCounts.totalCount}
                    type="messages"
                  />
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {filteredMessages.map((message) => (
                  <EnhancedMessageBubble
                    key={message.id}
                    message={message}
                    onRetry={message.smsStatus === 'failed' ? () => retryMessage(selectedConversation.leadId, message.id) : undefined}
                  />
                ))}
              </div>

              {/* Message Input */}
              {canReply && (
                <div className="p-4 border-t border-gray-200 bg-white">
                  <InventoryAwareMessageInput
                    leadId={selectedConversation.leadId}
                    conversationHistory={filteredMessages.map(m => `${m.direction === 'in' ? 'Customer' : 'Sales'}: ${m.body}`).join('\n')}
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

        {/* Right Sidebar - AI Panels */}
        {selectedConversation && (
          <div className="w-80 border-l border-gray-200 bg-white flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold">AI Assistant</h3>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <CollapsibleAIPanels
                showLearningDashboard={showLearningDashboard}
                showPredictiveInsights={showPredictiveInsights}
                onToggleLearningDashboard={() => setShowLearningDashboard(!showLearningDashboard)}
                onTogglePredictiveInsights={() => setShowPredictiveInsights(!showPredictiveInsights)}
                selectedConversation={selectedConversation}
              />

              <AIResponseSuggestionPanel
                selectedConversation={selectedConversation}
                messages={filteredMessages}
                onSendMessage={handleSendMessage}
                canReply={canReply || false}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartInboxWithAILearning;
