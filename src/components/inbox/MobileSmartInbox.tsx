
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useConversationsList } from '@/hooks/conversation/useConversationsList';
import { useMessagesOperations } from '@/hooks/conversation/useMessagesOperations';
import { useMarkAsRead } from '@/hooks/useMarkAsRead';
import { useRobustMessageLoader } from '@/hooks/messaging/useRobustMessageLoader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, AlertCircle, Inbox, Loader2 } from "lucide-react";
import ConversationsList from './ConversationsList';
import EnhancedChatView from './EnhancedChatView';
import LeadContextPanel from './LeadContextPanel';
import AITopBar from './AITopBar';
import ErrorBoundary from './ErrorBoundary';
import { SimpleLoading } from '@/components/ui/SimpleLoading';
import type { ConversationListItem } from '@/hooks/conversation/conversationTypes';

interface MobileSmartInboxProps {
  onLeadsRefresh: () => void;
  preselectedLeadId?: string | null;
}

const MobileSmartInbox: React.FC<MobileSmartInboxProps> = ({
  onLeadsRefresh,
  preselectedLeadId
}) => {
  const { profile, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("unread");
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'chat' | 'context'>('list');
  
  const { conversations, conversationsLoading } = useConversationsList();
  const { messages, loadingState, loadMessages } = useRobustMessageLoader();
  const { sendMessage, sendingMessage } = useMessagesOperations();
  const { markAsRead } = useMarkAsRead();

  // Debug logging
  useEffect(() => {
    console.log('🔍 [MOBILE INBOX DEBUG] Component state:', {
      authLoading,
      profile: profile ? { id: profile.id, email: profile.email } : null,
      conversationsLoading,
      conversationsCount: conversations?.length || 0,
      selectedLead,
      mobileView
    });
  }, [authLoading, profile, conversationsLoading, conversations?.length, selectedLead, mobileView]);

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

  // Show loading during authentication
  if (authLoading) {
    console.log('🔍 [MOBILE INBOX DEBUG] Auth loading...');
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <SimpleLoading message="Authenticating..." />
      </div>
    );
  }

  // Show error if not authenticated
  if (!profile) {
    console.log('🔍 [MOBILE INBOX DEBUG] No profile found');
    return (
      <div className="h-full flex items-center justify-center p-4 bg-background">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Authentication Required</h3>
          <p className="text-muted-foreground mb-4">
            Please log in to view your smart inbox.
          </p>
          <Button onClick={() => window.location.href = '/auth'}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // Show loading during conversations fetch
  if (conversationsLoading) {
    console.log('🔍 [MOBILE INBOX DEBUG] Conversations loading...');
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <SimpleLoading message="Loading conversations..." />
      </div>
    );
  }

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

  console.log('🔍 [MOBILE INBOX DEBUG] Rendering with data:', {
    conversationsCount: conversations.length,
    unreadCount: unreadConversations.length,
    incomingCount: allIncoming.length,
    currentView: mobileView
  });

  // Mobile List View
  if (mobileView === 'list') {
    return (
      <ErrorBoundary>
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
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8">
                <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Conversations Yet</h3>
                <p className="text-muted-foreground text-center">
                  Your conversations will appear here once leads start messaging.
                </p>
              </div>
            ) : (
              <ConversationsList
                conversations={getTabConversations()}
                selectedLead={selectedLead}
                onSelectConversation={handleSelectConversation}
                canReply={() => true}
                showUrgencyIndicator={activeTab === "unread"}
                showTimestamps={true}
                markAsRead={markAsRead}
              />
            )}
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // Mobile Chat View
  if (mobileView === 'chat') {
    return (
      <ErrorBoundary>
        <div className="h-full flex flex-col bg-background">
          {/* AI Top Bar */}
          <AITopBar
            selectedConversation={selectedConversation}
            messages={messages}
            onSendMessage={handleSendMessage}
            canReply={selectedConversation?.lastMessageDirection !== 'out'}
          />

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
              <h2 className="font-semibold truncate text-foreground">
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
              More
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
      </ErrorBoundary>
    );
  }

  // Mobile Context View
  if (mobileView === 'context') {
    return (
      <ErrorBoundary>
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
            <h2 className="font-semibold text-foreground">AI Assistant</h2>
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
      </ErrorBoundary>
    );
  }

  return null;
};

export default MobileSmartInbox;
