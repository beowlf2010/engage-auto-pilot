
import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthProvider';
import { useInboxFilters } from '@/hooks/useInboxFilters';
import { useInboxOperations } from '@/hooks/inbox/useInboxOperations';
import { useConversations } from '@/hooks/conversation/useConversations';
import { useMessages } from '@/hooks/conversation/useMessages';
import { fetchConversations, markMessagesAsRead } from '@/services/conversationsService';
import { ConversationListItem } from '@/types/conversation';
import { InboxFilters } from '@/hooks/useInboxFilters';
import SmartFilters from './SmartFilters';
import InboxConversationsList from './InboxConversationsList';
import InboxDebugPanel from './InboxDebugPanel';

// Simple conversation display component
const SimpleConversationView = ({ conversation }: { conversation: ConversationListItem }) => {
  return (
    <div className="flex-1 p-6">
      <div className="border rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-4">{conversation.leadName}</h2>
        <div className="space-y-2">
          <p><strong>Phone:</strong> {conversation.leadPhone}</p>
          <p><strong>Email:</strong> {conversation.leadEmail}</p>
          <p><strong>Vehicle Interest:</strong> {conversation.vehicleInterest}</p>
          <p><strong>Last Message:</strong> {conversation.lastMessage}</p>
          <p><strong>Status:</strong> {conversation.status}</p>
          {conversation.unreadCount > 0 && (
            <Badge variant="destructive">{conversation.unreadCount} unread</Badge>
          )}
        </div>
      </div>
    </div>
  );
};

interface SmartInboxProps {
  onBack?: () => void;
  leadId?: string;
}

const SmartInbox: React.FC<SmartInboxProps> = ({ onBack, leadId }) => {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<ConversationListItem[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationListItem | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);

  // Use inbox filters hook
  const { filters, updateFilter, clearFilters, hasActiveFilters, filterSummary, applyFilters } = useInboxFilters();

  // Create wrapper function to handle the filter update signature mismatch
  const handleFiltersChange = useCallback((newFilters: Partial<InboxFilters>) => {
    Object.entries(newFilters).forEach(([key, value]) => {
      updateFilter(key as keyof InboxFilters, value);
    });
  }, [updateFilter]);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!profile) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('📬 [SMART INBOX] Loading conversations...');
      const data = await fetchConversations(profile);
      console.log('✅ [SMART INBOX] Conversations loaded:', data.length);
      setConversations(data);
    } catch (err) {
      console.error('❌ [SMART INBOX] Error loading conversations:', err);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  // Apply filters and search
  useEffect(() => {
    let filtered = conversations;

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(conv => 
        conv.leadName.toLowerCase().includes(query) ||
        conv.leadPhone.includes(query) ||
        conv.vehicleInterest.toLowerCase().includes(query)
      );
    }

    // Apply filters
    filtered = applyFilters(filtered, filters);

    setFilteredConversations(filtered);
  }, [conversations, searchQuery, filters, applyFilters]);

  // Load conversations on mount and when profile changes
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Handle conversation selection
  const handleSelectConversation = useCallback((conversation: ConversationListItem) => {
    console.log('📱 [SMART INBOX] Selecting conversation:', conversation.leadId);
    setSelectedConversation(conversation);
  }, []);

  // Handle marking messages as read
  const handleMarkAsRead = useCallback(async (leadId: string) => {
    if (!profile) return;
    
    setIsMarkingAsRead(true);
    try {
      await markMessagesAsRead(leadId, profile.id);
      // Reload conversations to update unread counts
      await loadConversations();
    } catch (err) {
      console.error('Error marking messages as read:', err);
    } finally {
      setIsMarkingAsRead(false);
    }
  }, [profile, loadConversations]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    loadConversations();
  }, [loadConversations]);

  if (!profile) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600">Please log in to access the Smart Inbox</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            <h1 className="text-2xl font-bold">Smart Inbox</h1>
            <Badge variant="outline">
              {filteredConversations.length} conversations
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
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
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search conversations by name, phone, or vehicle interest..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="border-b bg-gray-50 p-4">
        <SmartFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          conversations={conversations}
          filteredConversations={filteredConversations}
          hasActiveFilters={hasActiveFilters}
          filterSummary={filterSummary}
          onClearFilters={clearFilters}
          userRole={profile.role}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 m-4">
          <div className="text-red-700">{error}</div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List */}
        <div className="w-1/3 border-r bg-white">
          <InboxConversationsList
            conversations={filteredConversations}
            selectedConversationId={selectedConversation?.leadId || null}
            onConversationSelect={handleSelectConversation}
            loading={loading}
            searchQuery={searchQuery}
            onMarkAsRead={handleMarkAsRead}
            isMarkingAsRead={isMarkingAsRead}
          />
        </div>

        {/* Conversation View */}
        <div className="flex-1">
          {selectedConversation ? (
            <SimpleConversationView conversation={selectedConversation} />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-lg text-gray-600">Select a conversation to view details</p>
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
