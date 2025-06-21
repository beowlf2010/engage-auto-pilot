
import React, { useState } from "react";
import { useStableConversationOperations } from "@/hooks/useStableConversationOperations";
import { useUnifiedAIScheduler } from "@/hooks/useUnifiedAIScheduler";
import { useLeads } from "@/hooks/useLeads";
import { useEnhancedMessageWrapper } from "./inbox/EnhancedMessageWrapper";
import { useSmartInventoryDetection } from "@/hooks/useSmartInventoryDetection";
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

  // Smart inventory detection for enhanced responses
  const { detectInventoryInMessage, shouldSuggestInventoryResponse } = useSmartInventoryDetection();

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

  // Enhanced send message function with inventory awareness
  const { sendEnhancedMessageWrapper } = useEnhancedMessageWrapper({
    onMessageSent: async () => {
      console.log('Enhanced message sent callback triggered');
      
      // Trigger inventory detection for the current conversation
      if (messages.length > 0) {
        const latestMessage = messages[messages.length - 1];
        if (latestMessage && latestMessage.leadId) {
          const conversationHistory = messages
            .map(msg => `${msg.direction === 'in' ? 'Customer' : 'Sales'}: ${msg.body}`)
            .join('\n');

          // Check if this might be an inventory-related conversation
          if (shouldSuggestInventoryResponse(conversationHistory, latestMessage.body)) {
            console.log('🔍 Potential inventory inquiry detected, analyzing...');
            
            try {
              const detection = await detectInventoryInMessage(
                latestMessage.leadId,
                conversationHistory,
                latestMessage.body
              );
              
              if (detection?.hasInventoryMatch) {
                console.log('✅ Inventory match found for customer inquiry');
              }
            } catch (error) {
              console.error('❌ Error in inventory detection:', error);
            }
          }
        }
      }
    },
    onLeadsRefresh: refreshLeads
  });

  // Filter conversations based on user role
  const filteredConversations = conversations.filter(conv => 
    user.role === "manager" || user.role === "admin" || conv.salespersonId === user.id || !conv.salespersonId
  );

  // Check if we should show status displays
  const shouldShowStatus = error || loading || filteredConversations.length === 0;

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
          loadMessages={loadMessages}
          sendMessage={sendEnhancedMessageWrapper}
          setError={setError}
          debugPanelOpen={debugPanelOpen}
          setDebugPanelOpen={setDebugPanelOpen}
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
