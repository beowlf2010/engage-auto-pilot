
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { fetchConversations, markMessagesAsRead } from '@/services/conversationsService';
import { stableRealtimeManager } from '@/services/stableRealtimeManager';
import InboxHeader from './InboxHeader';
import InboxSidebar from './InboxSidebar';
import InboxConversationsList from './InboxConversationsList';
import ConversationView from './ConversationView';
import InboxDebugPanel from './InboxDebugPanel';
import type { ConversationListItem } from '@/types/conversation';

interface SmartInboxProps {
  onBack: () => void;
  leadId?: string;
}

const SmartInbox = ({ onBack, leadId }: SmartInboxProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<ConversationListItem[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(leadId || null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!profile) {
      console.log('⏳ [SMART INBOX] No profile available, skipping load');
      return;
    }
    
    console.log('🔄 [SMART INBOX] Loading conversations...');
    setLoading(true);
    
    try {
      const data = await fetchConversations(profile);
      console.log('✅ [SMART INBOX] Conversations loaded:', {
        total: data.length,
        withUnread: data.filter(c => c.unreadCount > 0).length,
        totalUnreadMessages: data.reduce((sum, c) => sum + c.unreadCount, 0)
      });
      
      setConversations(data);
      
      // If leadId was provided and we don't have a selected conversation, try to find and select it
      if (leadId && !selectedConversationId) {
        const targetConversation = data.find(c => c.leadId === leadId);
        if (targetConversation) {
          console.log('🎯 [SMART INBOX] Auto-selecting conversation for leadId:', leadId);
          setSelectedConversationId(leadId);
        } else {
          console.warn('⚠️ [SMART INBOX] Could not find conversation for leadId:', leadId);
        }
      }
    } catch (error) {
      console.error('❌ [SMART INBOX] Error loading conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [profile, leadId, selectedConversationId, toast]);

  // Apply filters whenever conversations, search, or filter settings change
  useEffect(() => {
    console.log('🔍 [SMART INBOX] Applying filters:', {
      totalConversations: conversations.length,
      searchQuery,
      filterUnreadOnly,
      conversationsWithUnread: conversations.filter(c => c.unreadCount > 0).length
    });

    let filtered = [...conversations];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(conv =>
        conv.leadName.toLowerCase().includes(query) ||
        conv.leadPhone.toLowerCase().includes(query) ||
        conv.lastMessage.toLowerCase().includes(query) ||
        conv.vehicleInterest.toLowerCase().includes(query)
      );
    }
    
    // Apply unread filter
    if (filterUnreadOnly) {
      filtered = filtered.filter(conv => conv.unreadCount > 0);
    }
    
    console.log('✅ [SMART INBOX] Filters applied:', {
      filteredCount: filtered.length,
      withUnread: filtered.filter(c => c.unreadCount > 0).length,
      totalUnreadInFiltered: filtered.reduce((sum, c) => sum + c.unreadCount, 0)
    });
    
    setFilteredConversations(filtered);
  }, [conversations, searchQuery, filterUnreadOnly]);

  // Load conversations on mount and when profile changes
  useEffect(() => {
    if (profile) {
      loadConversations();
    }
  }, [profile, loadConversations]);

  // Set up realtime subscription
  useEffect(() => {
    if (!profile?.id) return;

    console.log('🔗 [SMART INBOX] Setting up realtime subscription');

    const unsubscribe = stableRealtimeManager.subscribe({
      id: `smart-inbox-${profile.id}`,
      callback: (payload) => {
        console.log('🔄 [SMART INBOX] Realtime update received:', payload.eventType);
        
        if (payload.table === 'conversations') {
          if (payload.eventType === 'INSERT' && payload.new?.direction === 'in') {
            console.log('📬 [SMART INBOX] New incoming message - refreshing conversations');
            loadConversations();
          } else if (payload.eventType === 'UPDATE' && 
                     payload.new?.read_at && !payload.old?.read_at) {
            console.log('📖 [SMART INBOX] Message marked as read - refreshing conversations');
            loadConversations();
          }
        }
      },
      filters: {
        event: '*',
        schema: 'public',
        table: 'conversations'
      }
    });

    return () => {
      console.log('🔌 [SMART INBOX] Cleaning up realtime subscription');
      unsubscribe();
    };
  }, [profile?.id, loadConversations]);

  const handleConversationSelect = (conversation: ConversationListItem) => {
    console.log('👆 [SMART INBOX] Conversation selected:', {
      leadId: conversation.leadId,
      leadName: conversation.leadName,
      unreadCount: conversation.unreadCount
    });
    setSelectedConversationId(conversation.leadId);
  };

  const handleMarkAsRead = async (leadId: string) => {
    console.log('📖 [SMART INBOX] Marking messages as read for:', leadId);
    setIsMarkingAsRead(true);
    
    try {
      await markMessagesAsRead(leadId);
      
      // Refresh conversations to update unread counts
      await loadConversations();
      
      toast({
        title: "Messages marked as read",
        description: "All messages for this conversation have been marked as read.",
      });
    } catch (error) {
      console.error('❌ [SMART INBOX] Error marking messages as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark messages as read. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsMarkingAsRead(false);
    }
  };

  const selectedConversation = conversations.find(c => c.leadId === selectedConversationId);

  return (
    <div className="h-full w-full bg-background flex flex-col relative">
      <InboxHeader 
        onBack={onBack}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterUnreadOnly={filterUnreadOnly}
        onFilterChange={setFilterUnreadOnly}
        conversationCount={filteredConversations.length}
        unreadCount={filteredConversations.reduce((sum, c) => sum + c.unreadCount, 0)}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 border-r bg-muted/30 flex flex-col">
          <InboxConversationsList
            conversations={filteredConversations}
            selectedConversationId={selectedConversationId}
            onConversationSelect={handleConversationSelect}
            loading={loading}
            searchQuery={searchQuery}
            onMarkAsRead={handleMarkAsRead}
            isMarkingAsRead={isMarkingAsRead}
          />
        </div>
        
        <div className="flex-1">
          {selectedConversation ? (
            <ConversationView
              conversation={selectedConversation}
              onClose={() => setSelectedConversationId(null)}
              onRefresh={loadConversations}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
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
      {process.env.NODE_ENV === 'development' && (
        <InboxDebugPanel
          conversations={conversations}
          filteredConversations={filteredConversations}
          onRefresh={loadConversations}
        />
      )}
    </div>
  );
};

export default SmartInbox;
