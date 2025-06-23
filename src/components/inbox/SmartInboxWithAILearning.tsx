
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOptimizedInbox } from '@/hooks/useOptimizedInbox';
import { useInboxFilters } from '@/hooks/useInboxFilters';
import { useAuth } from '@/components/auth/AuthProvider';
import { useAutoAIResponses } from '@/hooks/useAutoAIResponses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, Users, Clock, Search, Filter, RefreshCw, Zap, Brain, Sparkles, X } from 'lucide-react';
import EnhancedConversationListItem from './EnhancedConversationListItem';
import EnhancedMessageBubble from './EnhancedMessageBubble';
import InventoryAwareMessageInput from './InventoryAwareMessageInput';
import ConnectionStatusIndicator from './ConnectionStatusIndicator';
import LeadContextPanel from './LeadContextPanel';
import AIResponseIndicator from './AIResponseIndicator';
import AIResponsePreview from './AIResponsePreview';
import { ConversationListItem, MessageData } from '@/types/conversation';
import { toast } from '@/hooks/use-toast';

interface SmartInboxWithAILearningProps {
  user: {
    id: string;
    role: string;
  };
}

const SmartInboxWithAILearning: React.FC<SmartInboxWithAILearningProps> = ({ user }) => {
  const { profile } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<ConversationListItem | null>(null);
  const [messageText, setMessageText] = useState('');
  const [aiPreviews, setAiPreviews] = useState<Map<string, any>>(new Map());
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

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
    setError
  } = useOptimizedInbox();

  const {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    applyFilters
  } = useInboxFilters(profile?.id);

  const { manualTrigger: triggerAI } = useAutoAIResponses({
    profileId: profile?.id || '',
    onResponsePreview: (leadId: string, preview: any) => {
      setAiPreviews(prev => new Map(prev.set(leadId, preview)));
    }
  });

  // Apply filters to conversations
  const filteredConversations = useMemo(() => {
    return applyFilters(conversations);
  }, [conversations, applyFilters]);

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
    setSelectedConversation(conversation);
  }, []);

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

  const handleAITrigger = useCallback(async (leadId: string) => {
    try {
      await triggerAI(leadId);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to trigger AI response",
        variant: "destructive"
      });
    }
  }, [triggerAI]);

  const handleAIPreviewSent = useCallback((leadId: string) => {
    setAiPreviews(prev => {
      const updated = new Map(prev);
      updated.delete(leadId);
      return updated;
    });
    manualRefresh();
  }, [manualRefresh]);

  const handleAIPreviewDismiss = useCallback((leadId: string) => {
    setAiPreviews(prev => {
      const updated = new Map(prev);
      updated.delete(leadId);
      return updated;
    });
  }, []);

  const mockMarkAsRead = async (leadId: string) => {
    console.log('Mark as read:', leadId);
  };

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
            <Button onClick={manualRefresh} variant="ghost" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search conversations..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2 mb-3">
            <Button
              variant={filters.unreadOnly ? "default" : "outline"}
              size="sm"
              onClick={() => updateFilter('unreadOnly', !filters.unreadOnly)}
            >
              Unread Only
            </Button>
            <Button
              variant={filters.myLeadsOnly ? "default" : "outline"}
              size="sm"
              onClick={() => updateFilter('myLeadsOnly', !filters.myLeadsOnly)}
            >
              My Leads
            </Button>
            <Button
              variant={filters.inboundOnly ? "default" : "outline"}
              size="sm"
              onClick={() => updateFilter('inboundOnly', !filters.inboundOnly)}
            >
              Inbound Messages
            </Button>
          </div>

          {/* Advanced Filters Toggle */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="text-sm"
            >
              <Filter className="h-4 w-4 mr-1" />
              Advanced Filters
            </Button>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-sm text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <Card className="mt-3">
              <CardContent className="p-3 space-y-3">
                {/* Status Filter */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Status</label>
                  <div className="flex flex-wrap gap-1">
                    {['new', 'active', 'engaged', 'qualified', 'lost'].map(status => (
                      <Button
                        key={status}
                        variant={filters.status.includes(status) ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          const currentStatus = filters.status;
                          const newStatus = currentStatus.includes(status)
                            ? currentStatus.filter(s => s !== status)
                            : [...currentStatus, status];
                          updateFilter('status', newStatus);
                        }}
                        className="text-xs h-6 px-2"
                      >
                        {status}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* AI Opt-in Filter */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">AI Enabled</label>
                  <div className="flex gap-1">
                    <Button
                      variant={filters.aiOptIn === true ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateFilter('aiOptIn', filters.aiOptIn === true ? null : true)}
                      className="text-xs h-6 px-2"
                    >
                      AI On
                    </Button>
                    <Button
                      variant={filters.aiOptIn === false ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateFilter('aiOptIn', filters.aiOptIn === false ? null : false)}
                      className="text-xs h-6 px-2"
                    >
                      AI Off
                    </Button>
                  </div>
                </div>

                {/* Priority Filter */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Priority</label>
                  <div className="flex gap-1">
                    {['high', 'unread', 'responded'].map(priority => (
                      <Button
                        key={priority}
                        variant={filters.priority === priority ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateFilter('priority', filters.priority === priority ? null : priority)}
                        className="text-xs h-6 px-2"
                      >
                        {priority}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center gap-4 text-sm text-gray-600 mt-3">
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
              {hasActiveFilters && (
                <Button onClick={clearFilters} variant="link" className="mt-2">
                  Clear filters to see all conversations
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map((conversation) => (
                <div key={conversation.leadId} className="relative">
                  <EnhancedConversationListItem
                    conversation={conversation}
                    isSelected={selectedConversation?.leadId === conversation.leadId}
                    onSelect={() => handleConversationSelect(conversation)}
                    canReply={canReply || false}
                    markAsRead={mockMarkAsRead}
                    isMarkingAsRead={false}
                  />
                  
                  {/* AI Preview Banner */}
                  {aiPreviews.has(conversation.leadId) && (
                    <div className="mx-2 mb-2">
                      <AIResponsePreview
                        leadId={conversation.leadId}
                        preview={aiPreviews.get(conversation.leadId)!}
                        profileId={profile?.id || ''}
                        onSent={() => handleAIPreviewSent(conversation.leadId)}
                        onDismiss={() => handleAIPreviewDismiss(conversation.leadId)}
                      />
                    </div>
                  )}
                  
                  {/* AI Status Indicator */}
                  <div className="absolute top-2 right-2">
                    <AIResponseIndicator
                      isGenerating={false}
                      canTrigger={!aiPreviews.has(conversation.leadId)}
                      hasPreview={aiPreviews.has(conversation.leadId)}
                      onManualTrigger={() => handleAITrigger(conversation.leadId)}
                    />
                  </div>
                </div>
              ))}
            </div>
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
                  
                  {/* AI Status for Selected Conversation */}
                  <AIResponseIndicator
                    isGenerating={false}
                    canTrigger={!aiPreviews.has(selectedConversation.leadId)}
                    hasPreview={aiPreviews.has(selectedConversation.leadId)}
                    onManualTrigger={() => handleAITrigger(selectedConversation.leadId)}
                  />
                </div>
              </div>
            </div>

            {/* AI Preview for Selected Conversation */}
            {aiPreviews.has(selectedConversation.leadId) && (
              <div className="p-4 border-b bg-blue-50">
                <AIResponsePreview
                  leadId={selectedConversation.leadId}
                  preview={aiPreviews.get(selectedConversation.leadId)!}
                  profileId={profile?.id || ''}
                  onSent={() => handleAIPreviewSent(selectedConversation.leadId)}
                  onDismiss={() => handleAIPreviewDismiss(selectedConversation.leadId)}
                />
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {conversationMessages.map((message) => (
                <EnhancedMessageBubble
                  key={message.id}
                  message={message}
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
