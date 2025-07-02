import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useConversationsList } from '@/hooks/conversation/useConversationsList';
import { useMessagesOperations } from '@/hooks/conversation/useMessagesOperations';
import { useMarkAsRead } from '@/hooks/useMarkAsRead';
import { useRobustMessageLoader } from '@/hooks/messaging/useRobustMessageLoader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, AlertCircle, Inbox } from "lucide-react";
import ConversationsList from './ConversationsList';
import EnhancedChatView from './EnhancedChatView';
import LeadContextPanel from './LeadContextPanel';
import type { ConversationListItem } from '@/hooks/conversation/conversationTypes';

interface MobileSmartInboxProps {
  onLeadsRefresh: () => void;
  preselectedLeadId?: string | null;
}

const MobileSmartInbox: React.FC<MobileSmartInboxProps> = ({
  onLeadsRefresh,
  preselectedLeadId
}) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("unread");
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'chat' | 'context'>('list');
  
  const { conversations, conversationsLoading } = useConversationsList();
  const { messages, loadingState, loadMessages } = useRobustMessageLoader();
  const { sendMessage, sendingMessage } = useMessagesOperations();
  const { markAsRead } = useMarkAsRead();

  // Auto-select conversation from URL
  useEffect(() => {
    if (preselectedLeadId && conversations.length > 0) {
      const leadExists = conversations.some(conv => conv.leadId === preselectedLeadId);
      if (leadExists) {
        setSelectedLead(preselectedLeadId);
        setMobileView('chat');
      }
    }
  }, [preselectedLeadId, conversations]);

  // Load messages when lead selected
  useEffect(() => {
    if (selectedLead) {
      loadMessages(selectedLead);
    }
  }, [selectedLead, loadMessages]);

  const handleSelectConversation = (leadId: string) => {
    setSelectedLead(leadId);
    setMobileView('chat');
  };

  const handleSendMessage = async (message: string) => {
    if (selectedLead) {
      await sendMessage(selectedLead, message);
    }
  };

  const handleBackToList = () => {
    setMobileView('list');
    setSelectedLead(null);
  };

  const handleShowContext = () => {
    setMobileView('context');
  };

  // Filter conversations
  const unreadConversations = conversations.filter(conv => conv.unreadCount > 0);
  const allIncoming = conversations.filter(conv => conv.lastMessageDirection === 'in');

  const getTabConversations = () => {
    switch (activeTab) {
      case "unread": return unreadConversations;
      case "incoming": return allIncoming;
      default: return conversations;
    }
  };

  const selectedConversation = conversations.find(conv => conv.leadId === selectedLead);

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-lg font-medium text-muted-foreground text-center">
          Please log in to view your inbox.
        </p>
      </div>
    );
  }

  // Mobile List View
  if (mobileView === 'list') {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Mobile Tabs */}
        <div className="px-4 py-3 border-b bg-card">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 h-10">
              <TabsTrigger value="unread" className="text-sm">
                <AlertCircle className="w-4 h-4 mr-1" />
                Unread
                {unreadConversations.length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 text-xs">
                    {unreadConversations.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="incoming" className="text-sm">
                <MessageSquare className="w-4 h-4 mr-1" />
                Recent
              </TabsTrigger>
              <TabsTrigger value="all" className="text-sm">
                <Inbox className="w-4 h-4 mr-1" />
                All
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          <ConversationsList
            conversations={getTabConversations()}
            selectedLead={selectedLead}
            onSelectConversation={handleSelectConversation}
            canReply={() => true}
            showUrgencyIndicator={activeTab === "unread"}
            showTimestamps={true}
            markAsRead={markAsRead}
          />
        </div>
      </div>
    );
  }

  // Mobile Chat View
  if (mobileView === 'chat') {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Chat Header */}
        <div className="flex items-center px-4 py-3 border-b bg-card">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBackToList}
            className="mr-3 p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold truncate">
              {selectedConversation?.leadName || 'Conversation'}
            </h2>
            <p className="text-sm text-muted-foreground truncate">
              {selectedConversation?.lastMessage}
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleShowContext}
            className="text-xs"
          >
            AI
          </Button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 min-h-0">
          <EnhancedChatView
            selectedConversation={selectedConversation}
            messages={messages}
            onSendMessage={handleSendMessage}
            showTemplates={false}
            onToggleTemplates={() => {}}
            user={{ role: profile.role, id: profile.id }}
            isLoading={sendingMessage || loadingState.isLoading}
          />
        </div>
      </div>
    );
  }

  // Mobile Context View
  if (mobileView === 'context') {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Context Header */}
        <div className="flex items-center px-4 py-3 border-b bg-card">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setMobileView('chat')}
            className="mr-3 p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="font-semibold">AI Assistant</h2>
        </div>

        {/* Context Panel */}
        <div className="flex-1 overflow-y-auto">
          <LeadContextPanel
            conversation={selectedConversation}
            messages={messages}
            onSendMessage={handleSendMessage}
            onScheduleAppointment={() => {
              console.log('Schedule appointment for', selectedConversation?.leadName);
            }}
            
          />
        </div>
      </div>
    );
  }

  return null;
};

export default MobileSmartInbox;