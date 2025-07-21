
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, Filter, RefreshCw } from 'lucide-react';
import { ConversationListItem } from '@/types/conversation';
import { ConversationsService } from '@/services/conversationsService';
import { useInboxFilters } from '@/hooks/useInboxFilters';
import { useToast } from '@/hooks/use-toast';
import InboxConversationsList from './InboxConversationsList';
import ConversationView from './ConversationView';
import SmartFilters from './SmartFilters';
import InboxDebugPanel from './InboxDebugPanel';

interface SmartInboxProps {
  onBack: () => void;
  leadId?: string;
}

const SmartInbox: React.FC<SmartInboxProps> = ({ onBack, leadId }) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<ConversationListItem | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);
  
  const {
    filters,
    setFilters,
    searchQuery,
    setSearchQuery,
    filteredConversations,
    hasActiveFilters,
    filterSummary,
    clearFilters
  } = useInboxFilters(conversations);

  console.log('🏠 [SMART INBOX] Component mounted with:', {
    profileId: profile?.id,
    leadId,
    conversationsCount: conversations.length,
    selectedConversation: selectedConversation?.leadId
  });

  const fetchConversations = useCallback(async () => {
    if (!profile?.id) {
      console.warn('🏠 [SMART INBOX] No profile ID available');
      return;
    }

    console.log('🔄 [SMART INBOX] Starting to fetch conversations...');
    setLoading(true);
    
    try {
      const conversationData = await ConversationsService.fetchConversations(profile.id);
      
      console.log('📊 [SMART INBOX] Conversations fetched:', {
        total: conversationData.length,
        withUnread: conversationData.filter(c => c.unreadCount > 0).length,
        unassigned: conversationData.filter(c => !c.salespersonId).length,
        assigned: conversationData.filter(c => c.salespersonId).length
      });
      
      setConversations(conversationData);
      
      // Auto-select conversation if leadId is provided
      if (leadId && conversationData.length > 0) {
        const targetConversation = conversationData.find(conv => conv.leadId === leadId);
        if (targetConversation) {
          console.log('🎯 [SMART INBOX] Auto-selecting conversation:', targetConversation.leadId);
          setSelectedConversation(targetConversation);
        }
      }
    } catch (error) {
      console.error('❌ [SMART INBOX] Error fetching conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [profile?.id, leadId, toast]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleConversationSelect = (conversation: ConversationListItem) => {
    console.log('👆 [SMART INBOX] Conversation selected:', conversation.leadId);
    setSelectedConversation(conversation);
  };

  const handleMarkAsRead = async (leadId: string) => {
    if (isMarkingAsRead) return;
    
    setIsMarkingAsRead(true);
    try {
      console.log('📖 [SMART INBOX] Marking conversation as read:', leadId);
      
      // Update the conversation in state immediately for better UX
      setConversations(prev => prev.map(conv => 
        conv.leadId === leadId 
          ? { ...conv, unreadCount: 0 }
          : conv
      ));
      
      // Also update selected conversation if it's the one being marked as read
      if (selectedConversation?.leadId === leadId) {
        setSelectedConversation(prev => prev ? { ...prev, unreadCount: 0 } : null);
      }
      
      toast({
        title: "Success",
        description: "Conversation marked as read",
      });
      
      // Refresh conversations to ensure consistency
      await fetchConversations();
    } catch (error) {
      console.error('❌ [SMART INBOX] Error marking as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark conversation as read",
        variant: "destructive",
      });
    } finally {
      setIsMarkingAsRead(false);
    }
  };

  const handleBackToList = () => {
    console.log('⬅️ [SMART INBOX] Back to conversation list');
    setSelectedConversation(null);
  };

  const handleRefreshConversations = async () => {
    console.log('🔄 [SMART INBOX] Manual refresh triggered');
    await fetchConversations();
  };

  return (
    <div className="h-full flex">
      {/* Sidebar - Conversation List */}
      <div className={`${selectedConversation ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-1/3 border-r bg-background`}>
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b bg-background">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-lg font-semibold">Smart Inbox</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshConversations}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex-shrink-0 p-4 border-b bg-muted/30">
            <SmartFilters
              filters={filters}
              onFiltersChange={setFilters}
              conversations={conversations}
              filteredConversations={filteredConversations}
              hasActiveFilters={hasActiveFilters}
              filterSummary={filterSummary}
              onClearFilters={clearFilters}
              userRole={profile?.role}
            />
          </div>
        )}

        {/* Conversation List */}
        <div className="flex-1 overflow-hidden">
          <InboxConversationsList
            conversations={filteredConversations}
            selectedConversationId={selectedConversation?.leadId || null}
            onConversationSelect={handleConversationSelect}
            loading={loading}
            searchQuery={searchQuery}
            onMarkAsRead={handleMarkAsRead}
            isMarkingAsRead={isMarkingAsRead}
          />
        </div>
      </div>

      {/* Main Content - Conversation View */}
      <div className={`${selectedConversation ? 'flex' : 'hidden lg:flex'} flex-col flex-1 bg-background`}>
        {selectedConversation ? (
          <ConversationView
            conversation={selectedConversation}
            onRefresh={handleRefreshConversations}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-gray-500">Choose a conversation from the list to view messages</p>
              <div className="mt-4 text-sm text-gray-400">
                Total conversations: {conversations.length} | 
                Filtered: {filteredConversations.length} | 
                With unread: {filteredConversations.filter(c => c.unreadCount > 0).length}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Debug Panel */}
      <InboxDebugPanel
        conversations={conversations}
        filteredConversations={filteredConversations}
        onRefresh={handleRefreshConversations}
      />
    </div>
  );
};

export default SmartInbox;
