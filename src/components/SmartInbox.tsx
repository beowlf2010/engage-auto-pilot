
import React from "react";
import { useStableConversationOperations } from "@/hooks/useStableConversationOperations";
import { useInboxOperations } from "@/hooks/inbox/useInboxOperations";
import { useConversationInitialization } from "@/hooks/inbox/useConversationInitialization";
import { useUnifiedAIScheduler } from "@/hooks/useUnifiedAIScheduler";
import { useLeads } from "@/hooks/useLeads";
import InboxStateManager from "./inbox/InboxStateManager";
import InboxStatusDisplay from "./inbox/InboxStatusDisplay";
import InboxLayout from "./inbox/InboxLayout";

interface SmartInboxProps {
  user: {
    role: string;
    id: string;
  };
}

const SmartInbox = ({ user }: SmartInboxProps) => {
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
    sendMessage, 
    manualRefresh,
    setError
  } = useStableConversationOperations({
    onLeadsRefresh: refreshLeads
  });

  // Get inbox operations
  const {
    canReply,
    handleSelectConversation,
    handleSendMessage,
    getLeadIdFromUrl
  } = useInboxOperations({
    user,
    loadMessages,
    sendMessage,
    sendingMessage,
    setError
  });

  // Filter conversations based on user role
  const filteredConversations = conversations.filter(conv => 
    user.role === "manager" || user.role === "admin" || conv.salespersonId === user.id || !conv.salespersonId
  );

  // Check if we should show status displays
  const shouldShowStatus = error || loading || filteredConversations.length === 0;

  if (shouldShowStatus) {
    return (
      <InboxStatusDisplay
        loading={loading}
        error={error}
        conversationsCount={filteredConversations.length}
        onRetry={manualRefresh}
      />
    );
  }

  return (
    <InboxStateManager>
      {({
        selectedLead,
        showMemory,
        showTemplates,
        isInitialized,
        setSelectedLead,
        setIsInitialized,
        handleToggleMemory,
        handleToggleTemplates
      }) => {
        const leadIdFromUrl = getLeadIdFromUrl();
        const selectedConversation = filteredConversations.find(conv => conv.leadId === selectedLead);

        // Handle conversation initialization
        useConversationInitialization({
          loading,
          isInitialized,
          filteredConversations,
          selectedLead,
          leadIdFromUrl,
          onSelectConversation: async (leadId: string) => {
            setSelectedLead(leadId);
            await handleSelectConversation(leadId);
          },
          setIsInitialized
        });

        // Handle sending messages with proper state management and leads refresh
        const onSendMessage = async (message: string, isTemplate?: boolean) => {
          await handleSendMessage(selectedLead, selectedConversation, message, isTemplate);
          if (isTemplate) {
            handleToggleTemplates();
          }
          // The leads refresh is automatically triggered by the conversation operations
        };

        // Main inbox layout
        return (
          <InboxLayout
            conversations={filteredConversations}
            messages={messages}
            selectedLead={selectedLead}
            selectedConversation={selectedConversation}
            showMemory={showMemory}
            showTemplates={showTemplates}
            sendingMessage={sendingMessage}
            user={user}
            onSelectConversation={async (leadId: string) => {
              setSelectedLead(leadId);
              await handleSelectConversation(leadId);
            }}
            onSendMessage={onSendMessage}
            onToggleTemplates={handleToggleTemplates}
            canReply={canReply}
          />
        );
      }}
    </InboxStateManager>
  );
};

export default SmartInbox;
