
import React from "react";
import { useStableConversationOperations } from "@/hooks/useStableConversationOperations";
import { useInboxOperations } from "@/hooks/inbox/useInboxOperations";
import { useConversationInitialization } from "@/hooks/inbox/useConversationInitialization";
import { useUnifiedAIScheduler } from "@/hooks/useUnifiedAIScheduler";
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

  // Use the stable conversation operations
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
  } = useStableConversationOperations();

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

        // Handle sending messages with proper state management
        const onSendMessage = async (message: string, isTemplate?: boolean) => {
          await handleSendMessage(selectedLead, selectedConversation, message, isTemplate);
          if (isTemplate) {
            handleToggleTemplates();
          }
        };

        // Show status displays for error, loading, or empty states
        const statusDisplay = (
          <InboxStatusDisplay
            loading={loading}
            error={error}
            conversationsCount={filteredConversations.length}
            onRetry={manualRefresh}
          />
        );

        if (statusDisplay) {
          return statusDisplay;
        }

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
