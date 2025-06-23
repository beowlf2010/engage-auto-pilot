import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOptimizedInbox } from '@/hooks/useOptimizedInbox';
import { useAutoAIResponses } from '@/hooks/useAutoAIResponses';
import { useInboxFilters } from '@/hooks/useInboxFilters';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  MessageCircle, 
  Users, 
  Clock, 
  Zap, 
  Brain, 
  Sparkles, 
  Search,
  Filter,
  Eye,
  Bot,
  ChevronDown,
  ChevronUp,
  MessageSquareMore,
  ArrowDownLeft
} from 'lucide-react';
import EnhancedConversationListItem from './EnhancedConversationListItem';
import AIResponsePreview from './AIResponsePreview';
import AIResponseIndicator from './AIResponseIndicator';
import { ConversationListItem, MessageData } from '@/types/conversation';
import { toast } from '@/hooks/use-toast';

interface SmartInboxWithAILearningProps {
  user: {
    id: string;
    role: string;
  };
  onLeadsRefresh?: () => void;
}

const SmartInboxWithAILearning: React.FC<SmartInboxWithAILearningProps> = ({ 
  user, 
  onLeadsRefresh 
}) => {
  const { profile } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<ConversationListItem | null>(null);
  const [messageText, setMessageText] = useState('');
  const [aiPreviews, setAiPreviews] = useState<Map<string, any>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const {
    conversations,
    messages,
    loading,
    loadMessages,
    sendMessage,
    retryMessage,
    markConversationRead,
    updateConversationStatus
  } = useOptimizedInbox({ 
    profileId: user.id,
    onLeadsRefresh: () => {
      console.log('Leads refreshed');
      onLeadsRefresh?.();
    }
  });

  const { manualTrigger } = useAutoAIResponses({
    profileId: user.id,
    onResponsePreview: (leadId, preview) => {
      setAiPreviews(prev => {
        const next = new Map(prev);
        next.set(leadId, preview);
        return next;
      });
    }
  });

  // Initialize filters with profile ID
  const {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    applyFilters
  } = useInboxFilters(profile?.id);

  useEffect(() => {
    if (profile?.id) {
      loadMessages();
    }
  }, [profile?.id, loadMessages]);

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

  const handleConversationSelect = useCallback(async (conversation: ConversationListItem) => {
    setSelectedConversation(conversation);
    await loadMessages(conversation.leadId);
  }, [loadMessages]);

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

  const mockMarkAsRead = async (leadId: string) => {
    try {
      await markConversationRead(leadId);
      toast({
        title: "Marked as Read",
        description: "Conversation marked as read successfully",
      });
    } catch (error) {
      console.error('Failed to mark as read:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to mark as read",
        variant: "destructive"
      });
    }
  };

  const handleStatusUpdate = async (leadId: string, newStatus: string) => {
    try {
      await updateConversationStatus(leadId, newStatus);
      toast({
        title: "Status Updated",
        description: `Conversation status updated to ${newStatus}`,
      });
    } catch (error) {
      console.error('Failed to update status:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update status",
        variant: "destructive"
      });
    }
  };

  // Apply filters to conversations
  const filteredConversations = useMemo(() => {
    let filtered = conversations;
    
    // Apply search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(conv => 
        conv.leadName.toLowerCase().includes(searchLower) ||
        conv.vehicleInterest.toLowerCase().includes(searchLower) ||
        conv.leadPhone.includes(searchTerm)
      );
    }
    
    // Apply other filters
    return applyFilters(filtered);
  }, [conversations, searchTerm, applyFilters]);

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
          </div>

          {/* Search Bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2 mb-3">
            <Button
              variant={filters.unreadOnly ? "default" : "outline"}
              size="sm"
              onClick={() => updateFilter('unreadOnly', !filters.unreadOnly)}
              className="text-xs"
            >
              <Eye className="h-3 w-3 mr-1" />
              Unread Only
            </Button>
            
            <Button
              variant={filters.myLeadsOnly ? "default" : "outline"}
              size="sm"
              onClick={() => updateFilter('myLeadsOnly', !filters.myLeadsOnly)}
              className="text-xs"
            >
              <Users className="h-3 w-3 mr-1" />
              My Leads
            </Button>

            <Button
              variant={filters.inboundOnly ? "default" : "outline"}
              size="sm"
              onClick={() => updateFilter('inboundOnly', !filters.inboundOnly)}
              className="text-xs"
            >
              <ArrowDownLeft className="h-3 w-3 mr-1" />
              Inbound Messages
            </Button>

            <Button
              variant={filters.aiOptIn === true ? "default" : "outline"}
              size="sm"
              onClick={() => updateFilter('aiOptIn', filters.aiOptIn === true ? null : true)}
              className="text-xs"
            >
              <Bot className="h-3 w-3 mr-1" />
              AI Enabled
            </Button>
          </div>

          {/* Advanced Filters Toggle */}
          <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between text-xs">
                <div className="flex items-center gap-1">
                  <Filter className="h-3 w-3" />
                  Advanced Filters
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-1 text-xs px-1">
                      Active
                    </Badge>
                  )}
                </div>
                {showAdvancedFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="space-y-2 mt-2">
              {/* Status Filter */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Status</label>
                <div className="flex flex-wrap gap-1">
                  {['new', 'engaged', 'qualified', 'closed'].map(status => (
                    <Button
                      key={status}
                      variant={filters.status.includes(status) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const newStatuses = filters.status.includes(status)
                          ? filters.status.filter(s => s !== status)
                          : [...filters.status, status];
                        updateFilter('status', newStatuses);
                      }}
                      className="text-xs capitalize"
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Priority Filter */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Priority</label>
                <div className="flex flex-wrap gap-1">
                  {[
                    { value: 'high', label: 'High Priority' },
                    { value: 'unread', label: 'Has Unread' },
                    { value: 'responded', label: 'Responded' }
                  ].map(priority => (
                    <Button
                      key={priority.value}
                      variant={filters.priority === priority.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateFilter('priority', filters.priority === priority.value ? null : priority.value)}
                      className="text-xs"
                    >
                      {priority.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Assignment Filter */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Assignment</label>
                <div className="flex flex-wrap gap-1">
                  {[
                    { value: 'assigned', label: 'Assigned' },
                    { value: 'unassigned', label: 'Unassigned' },
                    { value: 'mine', label: 'Mine' }
                  ].map(assignment => (
                    <Button
                      key={assignment.value}
                      variant={filters.assigned === assignment.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateFilter('assigned', filters.assigned === assignment.value ? null : assignment.value)}
                      className="text-xs"
                    >
                      {assignment.label}
                    </Button>
                  ))}
                </div>
              </div>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="w-full text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear All Filters
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>

          <div className="flex items-center gap-4 text-sm text-gray-600 mt-3">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{filteredConversations.length} conversations</span>
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
                <p className="text-sm mt-2">Try adjusting your filters</p>
              )}
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div key={conversation.leadId} className="relative">
                <EnhancedConversationListItem
                  conversation={conversation}
                  isSelected={selectedConversation?.leadId === conversation.leadId}
                  onSelect={() => handleConversationSelect(conversation)}
                  canReply={canReply || false}
                  markAsRead={mockMarkAsRead}
                  isMarkingAsRead={false}
                />
                
                {/* AI Response Indicator */}
                <div className="absolute top-2 right-2">
                  <AIResponseIndicator
                    isGenerating={false}
                    hasPreview={aiPreviews.has(conversation.leadId)}
                    canTrigger={true}
                    onManualTrigger={() => manualTrigger(conversation.leadId)}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* AI Preview Section */}
        {Array.from(aiPreviews.entries()).map(([leadId, preview]) => (
          <AIResponsePreview
            key={leadId}
            leadId={leadId}
            preview={preview}
            profileId={profile?.id || ''}
            onSent={() => {
              setAiPreviews(prev => {
                const next = new Map(prev);
                next.delete(leadId);
                return next;
              });
              loadMessages();
            }}
            onDismiss={() => {
              setAiPreviews(prev => {
                const next = new Map(prev);
                next.delete(leadId);
                return next;
              });
            }}
            onFeedback={(feedback, notes) => {
              console.log('Feedback:', feedback, notes);
            }}
          />
        ))}

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
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const statuses = ['new', 'engaged', 'qualified', 'closed'];
                      const currentIndex = statuses.indexOf(selectedConversation.status);
                      const nextIndex = (currentIndex + 1) % statuses.length;
                      handleStatusUpdate(selectedConversation.leadId, statuses[nextIndex]);
                    }}
                  >
                    {selectedConversation.status}
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {conversationMessages.map((message) => (
                <div key={message.id}>
                  {message.body}
                </div>
              ))}
            </div>

            {/* Message Input */}
            {canReply && (
              <div className="p-4 border-t bg-white">
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    placeholder="Type your message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(messageText);
                      }
                    }}
                  />
                  <Button onClick={() => handleSendMessage(messageText)}>Send</Button>
                </div>
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
    </div>
  );
};

export default SmartInboxWithAILearning;
