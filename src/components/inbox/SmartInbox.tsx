
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, Filter, RefreshCw } from 'lucide-react';
import { fetchConversations, markMessagesAsRead } from '@/services/conversationsService';
import { useAuth } from '@/components/auth/AuthProvider';
import { useInboxFilters } from '@/hooks/useInboxFilters';
import { ConversationListItem } from '@/types/conversation';
import ConversationView from './ConversationView';
import InboxConversationsList from './InboxConversationsList';
import SmartFilters from './SmartFilters';
import InboxDebugPanel from './InboxDebugPanel';

interface SmartInboxProps {
  onBack: () => void;
  leadId?: string;
}

const SmartInbox: React.FC<SmartInboxProps> = ({ onBack, leadId }) => {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    applyFilters,
    getFilterSummary,
  } = useInboxFilters();

  // Apply search and filters to conversations
  const filteredConversations = useMemo(() => {
    let result = conversations;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(conv => 
        conv.leadName.toLowerCase().includes(query) ||
        conv.primaryPhone.includes(query) ||
        conv.vehicleInterest.toLowerCase().includes(query)
      );
    }

    // Apply other filters
    result = applyFilters(result);

    return result;
  }, [conversations, searchQuery, applyFilters]);

  const filterSummary = getFilterSummary();

  const loadConversations = useCallback(async () => {
    if (!profile?.id) return;
    
    try {
      setLoading(true);
      console.log('🔄 [SMART INBOX] Loading conversations...');
      
      const data = await fetchConversations();
      console.log('✅ [SMART INBOX] Loaded conversations:', {
        total: data.length,
        withUnread: data.filter(c => c.unreadCount > 0).length
      });
      
      setConversations(data);
      
      // Auto-select conversation if leadId is provided
      if (leadId) {
        const targetConversation = data.find(c => c.leadId === leadId);
        if (targetConversation) {
          setSelectedConversation(targetConversation);
        }
      }
    } catch (error) {
      console.error('❌ [SMART INBOX] Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [profile?.id, leadId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleSelectConversation = (conversation: ConversationListItem) => {
    console.log('📱 [SMART INBOX] Selecting conversation:', conversation.leadId);
    setSelectedConversation(conversation);
  };

  const handleMarkAsRead = async (leadId: string) => {
    try {
      setMarkingAsRead(leadId);
      console.log('📖 [SMART INBOX] Marking as read:', leadId);
      
      await markMessagesAsRead(leadId);
      
      // Update local state
      setConversations(prev => 
        prev.map(conv => 
          conv.leadId === leadId 
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
      
      // Update selected conversation if it's the one being marked
      if (selectedConversation?.leadId === leadId) {
        setSelectedConversation(prev => 
          prev ? { ...prev, unreadCount: 0 } : null
        );
      }
      
      console.log('✅ [SMART INBOX] Marked as read successfully');
    } catch (error) {
      console.error('❌ [SMART INBOX] Error marking as read:', error);
    } finally {
      setMarkingAsRead(null);
    }
  };

  const handleRefresh = async () => {
    await loadConversations();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <h1 className="text-xl font-semibold">Smart Inbox</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-blue-50 border-blue-200' : ''}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 bg-blue-500 text-white text-xs rounded-full w-2 h-2"></span>
              )}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <SmartFilters
              filters={filters}
              onFiltersChange={updateFilter}
              conversations={conversations}
              filteredConversations={filteredConversations}
              hasActiveFilters={hasActiveFilters}
              filterSummary={filterSummary}
              onClearFilters={clearFilters}
              userRole={profile?.role}
            />
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col">
          <InboxConversationsList
            conversations={filteredConversations}
            selectedConversationId={selectedConversation?.leadId || null}
            onConversationSelect={handleSelectConversation}
            loading={loading}
            searchQuery={searchQuery}
            onMarkAsRead={handleMarkAsRead}
            isMarkingAsRead={!!markingAsRead}
          />
        </div>

        {/* Conversation View */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <ConversationView
              conversation={selectedConversation}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-gray-400 mb-2">
                  <Search className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a conversation
                </h3>
                <p className="text-gray-500">
                  Choose a conversation from the list to view messages
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Debug Panel */}
      <InboxDebugPanel
        conversations={conversations}
        filteredConversations={filteredConversations}
        onRefresh={handleRefresh}
      />
    </div>
  );
};

export default SmartInbox;
