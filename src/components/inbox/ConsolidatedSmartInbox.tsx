
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useConversationsList } from '@/hooks/conversation/useConversationsList';
import { useMessagesOperations } from '@/hooks/conversation/useMessagesOperations';
import { useMarkAsRead } from '@/hooks/useMarkAsRead';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, AlertCircle, Inbox } from "lucide-react";
import ConversationsList from './ConversationsList';
import { ConversationListSkeleton } from '@/components/ui/skeletons/ConversationSkeleton';
import EnhancedChatView from './EnhancedChatView';
import LeadContextPanel from './LeadContextPanel';

interface ConsolidatedSmartInboxProps {
  onLeadsRefresh: () => void;
}

const ConsolidatedSmartInbox: React.FC<ConsolidatedSmartInboxProps> = ({
  onLeadsRefresh
}) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("unread");
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  
  const { 
    conversations, 
    conversationsLoading
  } = useConversationsList();

  const { 
    messages, 
    sendMessage, 
    loadMessages,
    sendingMessage 
  } = useMessagesOperations();

  const { markAsRead, isMarkingAsRead } = useMarkAsRead();

  // Load messages when a lead is selected
  useEffect(() => {
    if (selectedLead) {
      loadMessages(selectedLead);
    }
  }, [selectedLead, loadMessages]);

  const handleSelectConversation = async (leadId: string) => {
    setSelectedLead(leadId);
  };

  const handleSendMessage = async (message: string, isTemplate?: boolean) => {
    if (selectedLead) {
      await sendMessage(selectedLead, message);
    }
  };

  const canReply = (conversation: any) => {
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
  const getUrgencyLevel = (conv: any): 'high' | 'medium' | 'low' => {
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
    <div className="w-full">
      {/* Full-width tabs across the top */}
      <div className="mb-4">
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

      {/* Main content area with 3-column layout */}
      <div className="h-[calc(100vh-8rem)] flex space-x-4">
        {/* Conversations sidebar */}
        <div className="w-80 flex-shrink-0">
          <div className="h-full bg-white rounded-lg border shadow-sm">
            {/* Tab descriptions */}
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

            {/* Conversations list */}
            <div className="flex-1 overflow-y-auto">
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

        {/* Chat area - Main conversation view */}
        <div className="flex-1 min-w-0">
          <EnhancedChatView
            selectedConversation={selectedConversation}
            messages={messages}
            onSendMessage={handleSendMessage}
            showTemplates={false}
            onToggleTemplates={() => {}}
            user={{
              role: profile.role,
              id: profile.id
            }}
            isLoading={sendingMessage}
          />
        </div>

        {/* Lead Context Panel - AI and Actions */}
        <div className="w-80 flex-shrink-0">
          <LeadContextPanel
            conversation={selectedConversation}
            messages={messages}
            onSendMessage={handleSendMessage}
            onScheduleAppointment={() => {
              // Handle appointment scheduling
              console.log('Schedule appointment for', selectedConversation?.leadName);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ConsolidatedSmartInbox;
