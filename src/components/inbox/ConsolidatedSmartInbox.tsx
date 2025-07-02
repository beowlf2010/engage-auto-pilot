
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useConversationsList } from '@/hooks/conversation/useConversationsList';
import { useMessagesOperations } from '@/hooks/conversation/useMessagesOperations';
import { useMarkAsRead } from '@/hooks/useMarkAsRead';
import { useEnhancedRealtimeMessages } from '@/hooks/messaging/useEnhancedRealtimeMessages';
import { useRobustMessageLoader } from '@/hooks/messaging/useRobustMessageLoader';
import { useSmartMessageSync } from '@/hooks/messaging/useSmartMessageSync';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, AlertCircle, Inbox } from "lucide-react";
import ConversationsList from './ConversationsList';
import { ConversationListSkeleton } from '@/components/ui/skeletons/ConversationSkeleton';
import EnhancedChatView from './EnhancedChatView';
import LeadContextPanel from './LeadContextPanel';
import EnhancedMessageSyncDebugPanel from '@/components/debug/EnhancedMessageSyncDebugPanel';
import type { ConversationListItem } from '@/hooks/conversation/conversationTypes';

interface ConsolidatedSmartInboxProps {
  onLeadsRefresh: () => void;
}

const ConsolidatedSmartInbox: React.FC<ConsolidatedSmartInboxProps> = ({
  onLeadsRefresh
}) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("unread");
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);
  
  const { 
    conversations, 
    conversationsLoading,
    refetchConversations
  } = useConversationsList();

  // Enhanced message loading with retry and caching
  const { 
    messages: robustMessages, 
    loadingState, 
    loadMessages: robustLoadMessages,
    forceReload 
  } = useRobustMessageLoader();

  const { 
    sendMessage, 
    sendingMessage 
  } = useMessagesOperations();

  const { markAsRead, isMarkingAsRead } = useMarkAsRead();

  // Smart message synchronization
  const { debouncedRefreshConversations, deduplicatedUpdate } = useSmartMessageSync();

  // Real-time message synchronization with enhanced reliability
  const handleMessageUpdate = useCallback((leadId: string) => {
    console.log('📨 [ENHANCED INBOX] Real-time message update for lead:', leadId);
    deduplicatedUpdate(leadId, 'message');
    
    if (selectedLead === leadId) {
      robustLoadMessages(leadId);
    }
  }, [selectedLead, robustLoadMessages, deduplicatedUpdate]);

  const handleConversationUpdate = useCallback(() => {
    console.log('🔄 [ENHANCED INBOX] Real-time conversation update');
    debouncedRefreshConversations();
    onLeadsRefresh();
  }, [debouncedRefreshConversations, onLeadsRefresh]);

  const { connectionStatus, forceReconnect, isConnected } = useEnhancedRealtimeMessages({
    onMessageUpdate: handleMessageUpdate,
    onConversationUpdate: handleConversationUpdate
  });

  // Load messages when a lead is selected with enhanced reliability
  useEffect(() => {
    if (selectedLead) {
      console.log('🎯 [ENHANCED INBOX] Loading messages for selected lead:', selectedLead);
      robustLoadMessages(selectedLead).catch(error => {
        console.error('❌ [ENHANCED INBOX] Failed to load messages:', error);
      });
    }
  }, [selectedLead, robustLoadMessages]);

  const handleSelectConversation = async (leadId: string) => {
    console.log('🎯 Selecting conversation for lead:', leadId);
    setSelectedLead(leadId);
  };

  const handleSendMessage = async (message: string, isTemplate?: boolean) => {
    if (selectedLead) {
      await sendMessage(selectedLead, message);
    }
  };

  const canReply = (conversation: ConversationListItem) => {
    return conversation.lastMessageDirection === 'in' || conversation.unreadCount > 0;
  };

  const selectedConversation = conversations.find(conv => conv.leadId === selectedLead);

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg font-medium text-gray-700">Please log in to view your inbox.</p>
      </div>
    );
  }

  // Filter conversations based on active tab
  const unreadConversations = conversations.filter(conv => conv.unreadCount > 0);
  const allIncoming = conversations.filter(conv => conv.lastMessageDirection === 'in');

  // Calculate urgency levels for unread messages
  const getUrgencyLevel = (conv: ConversationListItem): 'high' | 'medium' | 'low' => {
    const hoursSinceLastMessage = conv.lastMessageDate ? 
      (Date.now() - conv.lastMessageDate.getTime()) / (1000 * 60 * 60) : 0;
    
    if (conv.unreadCount > 3 || hoursSinceLastMessage > 24) return 'high';
    if (conv.unreadCount > 1 || hoursSinceLastMessage > 4) return 'medium';
    return 'low';
  };

  // Sort unread by urgency and time
  const sortedUnreadConversations = [...unreadConversations].sort((a, b) => {
    const urgencyOrder = { high: 0, medium: 1, low: 2 };
    const aUrgency = getUrgencyLevel(a);
    const bUrgency = getUrgencyLevel(b);
    
    if (aUrgency !== bUrgency) {
      return urgencyOrder[aUrgency] - urgencyOrder[bUrgency];
    }
    
    // Same urgency, sort by time (newest first)
    return (b.lastMessageDate?.getTime() || 0) - (a.lastMessageDate?.getTime() || 0);
  });

  // Sort all incoming by most recent
  const sortedAllIncoming = [...allIncoming].sort((a, b) => 
    (b.lastMessageDate?.getTime() || 0) - (a.lastMessageDate?.getTime() || 0)
  );

  const getTabConversations = () => {
    switch (activeTab) {
      case "unread":
        return sortedUnreadConversations;
      case "incoming":
        return sortedAllIncoming;
      case "all":
      default:
        return conversations;
    }
  };

  return (
    <div className="w-full h-full">
      {/* Full-width tabs across the top */}
      <div className="mb-4 flex-shrink-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100 h-12">
            <TabsTrigger value="unread" className="flex items-center gap-2 text-base">
              <AlertCircle className="w-4 h-4" />
              <span>Unread</span>
              {!conversationsLoading && unreadConversations.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadConversations.length}
                </Badge>
              )}
            </TabsTrigger>
            
            <TabsTrigger value="incoming" className="flex items-center gap-2 text-base">
              <MessageSquare className="w-4 h-4" />
              <span>All Incoming</span>
              {!conversationsLoading && (
                <Badge variant="secondary" className="text-xs">
                  {allIncoming.length}
                </Badge>
              )}
            </TabsTrigger>
            
            <TabsTrigger value="all" className="flex items-center gap-2 text-base">
              <Inbox className="w-4 h-4" />
              <span>All Conversations</span>
              {!conversationsLoading && (
                <Badge variant="outline" className="text-xs">
                  {conversations.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main content area with 3-column layout - Flexible height */}
      <div className="flex-1 flex gap-4 min-h-0" style={{ height: 'calc(100vh - 12rem)' }}>
        {/* Conversations sidebar - Fixed width */}
        <div className="w-80 flex-shrink-0">
          <div className="h-full bg-white rounded-lg border shadow-sm flex flex-col">
            {/* Tab descriptions */}
            <div className="flex-shrink-0">
              {activeTab === "unread" && !conversationsLoading && (
                <div className="flex items-center justify-between px-4 py-3 bg-red-50 border-b border-red-200">
                  <span className="text-sm font-medium text-red-800">
                    🚨 Priority: All Unread Messages
                  </span>
                  <span className="text-xs text-red-600">
                    {unreadConversations.length} leads need attention
                  </span>
                </div>
              )}
              
              {activeTab === "incoming" && !conversationsLoading && (
                <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-b border-blue-200">
                  <span className="text-sm font-medium text-blue-800">
                    📥 All Customer Messages
                  </span>
                  <span className="text-xs text-blue-600">
                    Last customer message shown first
                  </span>
                </div>
              )}
            </div>

            {/* Conversations list - Flexible height */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {conversationsLoading ? (
                <ConversationListSkeleton />
              ) : (
                <ConversationsList
                  conversations={getTabConversations()}
                  selectedLead={selectedLead}
                  onSelectConversation={handleSelectConversation}
                  canReply={canReply}
                  showUrgencyIndicator={activeTab === "unread"}
                  showTimestamps={activeTab === "incoming"}
                  markAsRead={markAsRead}
                  markingAsRead={isMarkingAsRead ? selectedLead : null}
                />
              )}
            </div>
          </div>
        </div>

        {/* Chat area - Main conversation view - Flexible width */}
        <div className="flex-1 min-w-0">
          <EnhancedChatView
            selectedConversation={selectedConversation}
            messages={robustMessages}
            onSendMessage={handleSendMessage}
            showTemplates={false}
            onToggleTemplates={() => {}}
            user={{
              role: profile.role,
              id: profile.id
            }}
            isLoading={sendingMessage || loadingState.isLoading}
          />
        </div>

        {/* Lead Context Panel - AI and Actions - Fixed width */}
        <div className="w-80 flex-shrink-0">
          <LeadContextPanel
            conversation={selectedConversation}
            messages={robustMessages}
            onSendMessage={handleSendMessage}
            onScheduleAppointment={() => {
              // Handle appointment scheduling
              console.log('Schedule appointment for', selectedConversation?.leadName);
            }}
          />
        </div>
      </div>

      {/* Enhanced Debug Panel */}
      <EnhancedMessageSyncDebugPanel
        isOpen={debugPanelOpen}
        onToggle={() => setDebugPanelOpen(!debugPanelOpen)}
        selectedLeadId={selectedLead}
        connectionStatus={connectionStatus}
        frontendMessages={robustMessages}
      />
    </div>
  );
};

export default ConsolidatedSmartInbox;
