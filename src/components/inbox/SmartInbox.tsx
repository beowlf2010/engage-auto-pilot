
import React, { useState, useEffect } from 'react';
import { useStableRealtimeInbox } from '@/hooks/useStableRealtimeInbox';
import { useInboxOperations } from '@/hooks/inbox/useInboxOperations';
import ConversationsList from './ConversationsList';
import EnhancedChatView from './EnhancedChatView';
import LeadContextPanel from './LeadContextPanel';
import { useAuth } from '@/components/auth/AuthProvider';
import { useSearchParams } from 'react-router-dom';
import type { ConversationListItem } from '@/types/conversation';

interface SmartInboxProps {
  onBack?: () => void;
  leadId?: string;
}

const SmartInbox: React.FC<SmartInboxProps> = ({ onBack, leadId: propLeadId }) => {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlLeadId = propLeadId || searchParams.get('leadId');
  
  const [selectedLead, setSelectedLead] = useState<string | null>(urlLeadId);
  const [selectedConversation, setSelectedConversation] = useState<ConversationListItem | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);

  // Use the stable realtime inbox system
  const {
    conversations,
    messages,
    loading,
    error,
    fetchMessages,
    sendMessage: stableSendMessage,
    refetch,
    isRealtimeConnected
  } = useStableRealtimeInbox();

  // Get user operations
  const user = {
    role: profile?.role || 'user',
    id: profile?.id || ''
  };

  const {
    canReply,
    handleSelectConversation,
    handleSendMessage
  } = useInboxOperations({
    user,
    loadMessages: fetchMessages,
    sendMessage: stableSendMessage,
    sendingMessage: loading,
    setError: () => {} // Error handling is done in the hook
  });

  // Handle conversation selection
  const onSelectConversation = async (leadId: string) => {
    console.log('🔄 [SMART INBOX] Selecting conversation:', leadId);
    setSelectedLead(leadId);
    
    // Update URL
    if (leadId !== urlLeadId) {
      setSearchParams({ leadId });
    }
    
    // Find the conversation
    const conversation = conversations.find(c => c.leadId === leadId);
    if (conversation) {
      setSelectedConversation(conversation);
    }
    
    // Load messages using stable operations
    await handleSelectConversation(leadId);
  };

  // Handle sending messages
  const onSendMessage = async (message: string, isTemplate?: boolean) => {
    if (selectedLead && selectedConversation) {
      await handleSendMessage(selectedLead, selectedConversation, message, isTemplate);
    }
  };

  // Mark messages as read
  const markAsRead = async (leadId: string) => {
    setMarkingAsRead(leadId);
    try {
      // Messages are automatically marked as read when loaded
      await fetchMessages(leadId);
    } finally {
      setMarkingAsRead(null);
    }
  };

  // Load initial conversation if specified
  useEffect(() => {
    if (urlLeadId && conversations.length > 0) {
      const conversation = conversations.find(c => c.leadId === urlLeadId);
      if (conversation && selectedLead !== urlLeadId) {
        onSelectConversation(urlLeadId);
      }
    }
  }, [urlLeadId, conversations]);

  // Connection status indicator
  const connectionStatus = isRealtimeConnected ? 'Connected' : 'Reconnecting...';

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-700">Authentication Required</div>
          <div className="text-sm text-gray-500 mt-1">Please sign in to access the inbox</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header with connection status */}
      <div className="border-b border-border px-4 py-2 flex items-center justify-between bg-card">
        <h1 className="text-lg font-semibold text-foreground">Smart Inbox</h1>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-green-500' : 'bg-orange-500'}`} />
          <span className="text-xs text-muted-foreground">{connectionStatus}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List */}
        <div className="w-1/3 border-r border-border flex flex-col">
          <ConversationsList
            conversations={conversations}
            selectedLead={selectedLead}
            onSelectConversation={onSelectConversation}
            markAsRead={markAsRead}
            markingAsRead={markingAsRead}
            canReply={canReply}
          />
        </div>

        {/* Chat View */}
        <div className="flex-1 flex flex-col">
          <EnhancedChatView
            messages={messages}
            selectedConversation={selectedConversation}
            showTemplates={showTemplates}
            onSendMessage={onSendMessage}
            onToggleTemplates={() => setShowTemplates(!showTemplates)}
            user={user}
            isLoading={loading}
          />
        </div>

        {/* Lead Context Panel */}
        {selectedConversation && (
          <div className="w-80 border-l border-border">
            <LeadContextPanel
              conversation={{
                leadId: selectedConversation.leadId,
                leadName: selectedConversation.leadName,
                leadPhone: selectedConversation.primaryPhone,
                vehicleInterest: selectedConversation.vehicleInterest,
                status: selectedConversation.status,
                lastMessageTime: selectedConversation.lastMessageTime,
                salespersonId: selectedConversation.salespersonId
              }}
              messages={messages}
              onSendMessage={onSendMessage}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="border-t border-border bg-destructive/10 px-4 py-2">
          <div className="text-sm text-destructive">{error}</div>
        </div>
      )}
    </div>
  );
};

export default SmartInbox;
