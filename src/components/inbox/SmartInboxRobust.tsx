
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useConversationOperations } from '@/hooks/useConversationOperations';
import { useInboxFilters } from '@/hooks/useInboxFilters';
import { useMarkAsRead } from '@/hooks/useMarkAsRead';
import { smartInboxDataLoader } from '@/services/smartInboxDataLoader';
import ConversationViewWithDebug from './ConversationViewWithDebug';
import ConversationsList from './ConversationsList';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import type { ConversationListItem } from '@/types/conversation';

interface SmartInboxRobustProps {
  onBack?: () => void;
  leadId?: string;
}

const SmartInboxRobust: React.FC<SmartInboxRobustProps> = ({ onBack, leadId }) => {
  const { profile } = useAuth();
  const { handleError } = useErrorHandler();
  
  // State management
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [selectedLead, setSelectedLead] = useState<string | null>(leadId || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStatusTab, setActiveStatusTab] = useState<string>('all');

  // Hooks
  const {
    applyFilters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    getFilterSummary,
    filters
  } = useInboxFilters();

  const { markAsRead, isMarkingAsRead } = useMarkAsRead();

  const {
    sendMessage: sendMessageOp,
    loadMessages,
    refreshConversations
  } = useConversationOperations();

  // Apply filters to conversations
  const filteredConversations = applyFilters(conversations);

  // Status tab filtering
  const statusFilteredConversations = filteredConversations.filter(conv => {
    if (activeStatusTab === 'all') return true;
    if (activeStatusTab === 'unread') return conv.unreadCount > 0;
    if (activeStatusTab === 'assigned') return conv.salespersonId === profile?.id;
    if (activeStatusTab === 'unassigned') return !conv.salespersonId;
    return true;
  });

  const selectedConversation = statusFilteredConversations.find(c => c.leadId === selectedLead);

  // Load initial conversations
  const loadConversations = useCallback(async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 [SMART INBOX ROBUST] Loading conversations...');
      const loadedConversations = await smartInboxDataLoader.loadConversationsRobustly();
      
      setConversations(loadedConversations);
      console.log(`✅ [SMART INBOX ROBUST] Loaded ${loadedConversations.length} conversations`);
      
      // Auto-select first conversation if leadId provided
      if (leadId && loadedConversations.some(c => c.leadId === leadId)) {
        setSelectedLead(leadId);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load conversations';
      console.error('❌ [SMART INBOX ROBUST] Error loading conversations:', errorMessage);
      setError(errorMessage);
      
      handleError(err, 'Loading conversations', {
        showToast: true,
        logError: true,
        fallbackMessage: 'Failed to load conversations. Please refresh.'
      });
    } finally {
      setLoading(false);
    }
  }, [profile?.id, leadId, handleError]);

  // Handle conversation selection
  const handleSelectConversation = useCallback(async (leadId: string) => {
    setSelectedLead(leadId);
    
    try {
      console.log(`🔄 [SMART INBOX ROBUST] Loading messages for lead: ${leadId}`);
      await loadMessages(leadId);
    } catch (err) {
      handleError(err, 'Loading conversation messages', {
        showToast: true,
        logError: true
      });
    }
  }, [loadMessages, handleError]);

  // Handle message sending
  const handleSendMessage = useCallback(async (message: string) => {
    if (!selectedLead) return;

    try {
      console.log(`📤 [SMART INBOX ROBUST] Sending message to lead: ${selectedLead}`);
      await sendMessageOp(selectedLead, message);
      
      // Refresh conversations to update unread counts
      await refreshConversations();
    } catch (err) {
      handleError(err, 'Sending message', {
        showToast: true,
        logError: true
      });
      throw err; // Re-throw so the UI can handle it
    }
  }, [selectedLead, sendMessageOp, refreshConversations, handleError]);

  // Handle mark as read
  const handleMarkAsRead = useCallback(async (leadId: string) => {
    try {
      console.log(`📖 [SMART INBOX ROBUST] Marking messages as read for lead: ${leadId}`);
      await markAsRead(leadId);
      
      // Update local state to reflect read status
      setConversations(prev => 
        prev.map(conv => 
          conv.leadId === leadId 
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
    } catch (err) {
      handleError(err, 'Marking messages as read', {
        showToast: true,
        logError: true
      });
    }
  }, [markAsRead, handleError]);

  // Status tab handlers
  const handleStatusTabClick = useCallback((tab: string) => {
    setActiveStatusTab(tab);
    setSelectedLead(null); // Clear selection when changing tabs
  }, []);

  const isFilterActive = useCallback((tab: string) => {
    return activeStatusTab === tab;
  }, [activeStatusTab]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Loading state
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-lg font-medium text-red-600 mb-2">
            Error Loading Inbox
          </div>
          <div className="text-sm text-gray-500 mb-4">
            {error}
          </div>
          <button
            onClick={loadConversations}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Conversations List */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        {/* Status Tabs */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex space-x-2">
            {['all', 'unread', 'assigned', 'unassigned'].map((tab) => (
              <button
                key={tab}
                onClick={() => handleStatusTabClick(tab)}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  isFilterActive(tab)
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'unread' && (
                  <span className="ml-1 px-1 py-0.5 text-xs bg-red-500 text-white rounded-full">
                    {statusFilteredConversations.filter(c => c.unreadCount > 0).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-hidden">
          <ConversationsList
            conversations={statusFilteredConversations}
            selectedLead={selectedLead}
            onSelectConversation={handleSelectConversation}
            markAsRead={handleMarkAsRead}
            markingAsRead={isMarkingAsRead ? selectedLead : null}
            canReply={() => true}
          />
        </div>

        {/* Filter Summary */}
        {hasActiveFilters && (
          <div className="p-3 bg-gray-50 border-t">
            <div className="text-xs text-gray-600">
              Active filters: {getFilterSummary().join(', ')}
            </div>
            <button
              onClick={clearFilters}
              className="text-xs text-blue-600 hover:text-blue-700 mt-1"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Conversation View */}
      <div className="flex-1">
        {selectedConversation ? (
          <ConversationViewWithDebug
            conversation={selectedConversation}
            onBack={() => setSelectedLead(null)}
            onSendMessage={handleSendMessage}
            sending={false}
            onMarkAsRead={() => handleMarkAsRead(selectedConversation.leadId)}
            canReply={true}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-lg font-medium mb-2">
                Select a conversation to start
              </div>
              <div className="text-sm">
                Choose a conversation from the list to view and respond to messages
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartInboxRobust;
