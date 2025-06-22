
import React, { useState } from "react";
import { useStableConversationOperations } from "@/hooks/useStableConversationOperations";
import { useUnifiedAIScheduler } from "@/hooks/useUnifiedAIScheduler";
import { useLeads } from "@/hooks/useLeads";
import { useEnhancedMessageWrapper } from "./inbox/EnhancedMessageWrapper";
import { useMarkAsRead } from "@/hooks/inbox/useMarkAsRead";
import InboxStateManager from "./inbox/InboxStateManager";
import InboxStatusDisplay from "./inbox/InboxStatusDisplay";
import SmartInboxMain from "./inbox/SmartInboxMain";
import MessageDebugPanel from "./debug/MessageDebugPanel";

interface SmartInboxProps {
  user: {
    role: string;
    id: string;
  };
}

const SmartInbox = ({ user }: SmartInboxProps) => {
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);
  
  // Use the unified AI scheduler
  useUnifiedAIScheduler();

  // Get leads refresh function
  const { forceRefresh: refreshLeads } = useLeads();

  // Use the stable conversation operations with leads refresh callback
  const { 
    conversations, 
    messages, 
    loading, 
    error,
    sendingMessage,
    loadMessages, 
    sendMessage: originalSendMessage, 
    manualRefresh,
    setError
  } = useStableConversationOperations({
    onLeadsRefresh: refreshLeads
  });

  // Mark as read functionality
  const { markAsRead, markingAsRead } = useMarkAsRead(manualRefresh);

  // Enhanced send message function
  const { sendEnhancedMessageWrapper } = useEnhancedMessageWrapper({
    onMessageSent: async () => {
      console.log('Enhanced message sent callback triggered');
    },
    onLeadsRefresh: refreshLeads
  });

  // Filter conversations based on user role
  const filteredConversations = conversations.filter(conv => 
    user.role === "manager" || user.role === "admin" || conv.salespersonId === user.id || !conv.salespersonId
  );

  console.log('🔄 [SMART INBOX] Render state:', {
    loading,
    conversationsCount: filteredConversations.length,
    hasError: !!error
  });

  // Check if we should show status displays
  const shouldShowStatus = error || (loading && filteredConversations.length === 0);

  if (shouldShowStatus) {
    return (
      <>
        <InboxStatusDisplay
          loading={loading}
          error={error}
          conversationsCount={filteredConversations.length}
          onRetry={manualRefresh}
        />
        <MessageDebugPanel
          isOpen={debugPanelOpen}
          onToggle={() => setDebugPanelOpen(!debugPanelOpen)}
        />
      </>
    );
  }

  return (
    <InboxStateManager>
      {(stateProps) => (
        <SmartInboxMain
          user={user}
          conversations={filteredConversations}
          messages={messages}
          sendingMessage={sendingMessage}
          loading={loading}
          loadMessages={loadMessages}
          sendMessage={sendEnhancedMessageWrapper}
          setError={setError}
          debugPanelOpen={debugPanelOpen}
          setDebugPanelOpen={setDebugPanelOpen}
          markAsRead={markAsRead}
          markingAsRead={markingAsRead}
          getLeadIdFromUrl={() => {
            const searchParams = new URLSearchParams(window.location.search);
            return searchParams.get('leadId');
          }}
          {...stateProps}
        />
      )}
    </InboxStateManager>
  );
};

export default SmartInbox;
