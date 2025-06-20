
import React, { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useStableConversationOperations } from "@/hooks/useStableConversationOperations";
import { useInboxOperations } from "@/hooks/inbox/useInboxOperations";
import { useConversationInitialization } from "@/hooks/inbox/useConversationInitialization";
import { useUnifiedAIScheduler } from "@/hooks/useUnifiedAIScheduler";
import { useLeads } from "@/hooks/useLeads";
import { sendEnhancedMessage } from "@/services/enhancedMessagesService";
import InboxStateManager from "./inbox/InboxStateManager";
import InboxStatusDisplay from "./inbox/InboxStatusDisplay";
import InboxLayout from "./inbox/InboxLayout";
import MessageDebugPanel from "./debug/MessageDebugPanel";
import { toast } from "@/hooks/use-toast";

interface SmartInboxProps {
  user: {
    role: string;
    id: string;
  };
}

const SmartInbox = ({ user }: SmartInboxProps) => {
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);
  const { profile } = useAuth();
  
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

  // Enhanced send message function with debug logging
  const sendEnhancedMessageWrapper = async (leadId: string, messageText: string) => {
    if (!profile || !messageText.trim()) {
      const error = 'Missing profile or message text';
      console.error('❌ [SMART INBOX] Enhanced send failed:', error);
      
      // Use global debug function if available
      if ((window as any).debugLog) {
        (window as any).debugLog('error', 'Smart Inbox', 'Send Message Failed', { 
          error, 
          hasProfile: !!profile, 
          messageLength: messageText?.length || 0 
        });
      }
      
      throw new Error(error);
    }

    try {
      console.log('📤 [SMART INBOX] Using enhanced message service');
      
      const result = await sendEnhancedMessage({
        leadId,
        messageBody: messageText.trim(),
        profile,
        isAIGenerated: false
      });

      if (!result.success) {
        throw new Error(result.error || 'Enhanced message sending failed');
      }

      // Reload messages to show the new message
      await loadMessages(leadId);
      
      // Trigger leads refresh
      refreshLeads();
      
      console.log('✅ [SMART INBOX] Enhanced message sent successfully');
      
    } catch (err: any) {
      console.error('❌ [SMART INBOX] Enhanced send error:', err);
      
      // Use global debug function if available
      if ((window as any).debugLog) {
        (window as any).debugLog('error', 'Smart Inbox', 'Enhanced Send Failed', { 
          leadId, 
          error: err.message,
          profileId: profile?.id 
        });
      }
      
      throw err;
    }
  };

  // Get inbox operations with enhanced messaging
  const {
    canReply,
    handleSelectConversation,
    handleSendMessage,
    getLeadIdFromUrl
  } = useInboxOperations({
    user,
    loadMessages,
    sendMessage: sendEnhancedMessageWrapper, // Use enhanced version
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

        // Handle sending messages with enhanced service and debug logging
        const onSendMessage = async (message: string, isTemplate?: boolean) => {
          try {
            await handleSendMessage(selectedLead, selectedConversation, message, isTemplate);
            if (isTemplate) {
              handleToggleTemplates();
            }
          } catch (error) {
            console.error('❌ [SMART INBOX] Send message error:', error);
            
            // Use global debug function if available
            if ((window as any).debugLog) {
              (window as any).debugLog('error', 'Smart Inbox', 'Send Message Handler Failed', { 
                selectedLead,
                conversationLeadId: selectedConversation?.leadId,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
            
            toast({
              title: "Failed to send message",
              description: error instanceof Error ? error.message : "Please try again",
              variant: "destructive"
            });
          }
        };

        // Main inbox layout
        return (
          <>
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
            <MessageDebugPanel
              isOpen={debugPanelOpen}
              onToggle={() => setDebugPanelOpen(!debugPanelOpen)}
              leadId={selectedLead || undefined}
            />
          </>
        );
      }}
    </InboxStateManager>
  );
};

export default SmartInbox;
