
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, Filter } from 'lucide-react';
import { fetchConversations, markMessagesAsRead } from '@/services/conversationsService';
import { useAuth } from '@/components/auth/AuthProvider';
import { useInboxFilters } from '@/hooks/useInboxFilters';
import type { ConversationListItem } from '@/types/conversation';
import type { InboxFilters } from '@/hooks/useInboxFilters';
import SmartFilters from './SmartFilters';
import InboxConversationsList from './InboxConversationsList';
import InboxDebugPanel from './InboxDebugPanel';
import MessageDebugPanel from '../debug/MessageDebugPanel';

interface SmartInboxProps {
  onBack: () => void;
  leadId?: string;
}

// Simple conversation view component
const SimpleConversationView = ({ conversation }: { conversation: ConversationListItem }) => (
  <Card className="h-full">
    <CardHeader>
      <CardTitle className="flex items-center justify-between">
        <span>{conversation.leadName}</span>
        <span className="text-sm text-gray-500">{conversation.leadPhone}</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <div>
          <h4 className="font-medium">Vehicle Interest</h4>
          <p className="text-gray-600">{conversation.vehicleInterest}</p>
        </div>
        <div>
          <h4 className="font-medium">Last Message</h4>
          <p className="text-gray-600">{conversation.lastMessage}</p>
          <p className="text-xs text-gray-400 mt-1">{conversation.lastMessageTime}</p>
        </div>
        <div>
          <h4 className="font-medium">Status</h4>
          <p className="text-gray-600">{conversation.status}</p>
        </div>
        {conversation.salespersonName && (
          <div>
            <h4 className="font-medium">Assigned To</h4>
            <p className="text-gray-600">{conversation.salespersonName}</p>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

const SmartInbox: React.FC<SmartInboxProps> = ({ onBack, leadId }) => {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);

  // Use inbox filters hook
  const {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    applyFilters,
    getFilterSummary
  } = useInboxFilters();

  // Apply filters and search to conversations
  const filteredConversations = React.useMemo(() => {
    let filtered = applyFilters(conversations);
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(conv =>
        conv.leadName.toLowerCase().includes(query) ||
        conv.leadPhone.includes(query) ||
        conv.vehicleInterest.toLowerCase().includes(query) ||
        conv.lastMessage.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [conversations, applyFilters, searchQuery]);

  // Load conversations
  const loadConversations = async () => {
    if (!profile) return;
    
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 [SMART INBOX] Loading conversations...');
      
      const data = await fetchConversations(profile);
      setConversations(data);
      
      console.log('✅ [SMART INBOX] Loaded conversations:', data.length);
      
      // Auto-select conversation if leadId is provided
      if (leadId && data.length > 0) {
        const targetConversation = data.find(conv => conv.leadId === leadId);
        if (targetConversation) {
          setSelectedConversation(targetConversation);
          console.log('🎯 [SMART INBOX] Auto-selected conversation for lead:', leadId);
        }
      }
    } catch (err) {
      console.error('❌ [SMART INBOX] Error loading conversations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  // Handle conversation selection
  const handleConversationSelect = (conversation: ConversationListItem) => {
    setSelectedConversation(conversation);
    console.log('📱 [SMART INBOX] Selected conversation:', conversation.leadId);
  };

  // Handle mark as read
  const handleMarkAsRead = async (leadId: string) => {
    try {
      setIsMarkingAsRead(true);
      await markMessagesAsRead(leadId);
      
      // Update local state
      setConversations(prev => 
        prev.map(conv => 
          conv.leadId === leadId 
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
      
      console.log('✅ [SMART INBOX] Marked messages as read for lead:', leadId);
    } catch (err) {
      console.error('❌ [SMART INBOX] Error marking as read:', err);
      setError(err instanceof Error ? err.message : 'Failed to mark as read');
    } finally {
      setIsMarkingAsRead(false);
    }
  };

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [profile]);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-semibold">Smart Inbox</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button variant="outline" size="sm" onClick={loadConversations}>
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

        {/* Filters */}
        {showFilters && (
          <div className="mt-4">
            <SmartFilters
              filters={filters}
        onFiltersChange={(partialFilters) => {
          Object.entries(partialFilters).forEach(([key, value]) => {
            updateFilter(key as keyof InboxFilters, value);
          });
        }}
              conversations={conversations}
              filteredConversations={filteredConversations}
              hasActiveFilters={hasActiveFilters}
              filterSummary={getFilterSummary()}
              onClearFilters={clearFilters}
              userRole={profile?.role}
            />
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List */}
        <div className="w-1/3 border-r">
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

        {/* Conversation View */}
        <div className="flex-1 p-4">
          {selectedConversation ? (
            <SimpleConversationView conversation={selectedConversation} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                <p>Choose a conversation from the list to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Debug Panels */}
      <InboxDebugPanel
        conversations={conversations}
        filteredConversations={filteredConversations}
        onRefresh={loadConversations}
      />
      
      <MessageDebugPanel
        isOpen={debugPanelOpen}
        onToggle={() => setDebugPanelOpen(!debugPanelOpen)}
        leadId={selectedConversation?.leadId}
      />
    </div>
  );
};

export default SmartInbox;
