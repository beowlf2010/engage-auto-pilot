
import React from 'react';
import { useInboxOperations } from '@/hooks/inbox/useInboxOperations';
import { useConversationInitialization } from '@/hooks/inbox/useConversationInitialization';
import InboxLayout from './InboxLayout';
import MessageDebugPanel from '../debug/MessageDebugPanel';
import { toast } from '@/hooks/use-toast';
import type { ConversationListItem, MessageData } from '@/hooks/conversation/conversationTypes';

interface SmartInboxMainProps {
  user: {
    role: string;
    id: string;
  };
  conversations: ConversationListItem[];
  messages: MessageData[];
  sendingMessage: boolean;
  loadMessages: (leadId: string) => Promise<void>;
  sendMessage: (leadId: string, message: string) => Promise<void>;
  setError: (error: string | null) => void;
  selectedLead: string | null;
  showMemory: boolean;
  showTemplates: boolean;
  isInitialized: boolean;
  setSelectedLead: (leadId: string | null) => void;
  setIsInitialized: (initialized: boolean) => void;
  handleToggleMemory: () => void;
  handleToggleTemplates: () => void;
  getLeadIdFromUrl: () => string | null;
  debugPanelOpen: boolean;
  setDebugPanelOpen: (open: boolean) => void;
}

const SmartInboxMain: React.FC<SmartInboxMainProps> = ({
  user,
  conversations,
  messages,
  sendingMessage,
  loadMessages,
  sendMessage,
  setError,
  selectedLead,
  showMemory,
  showTemplates,
  isInitialized,
  setSelectedLead,
  setIsInitialized,
  handleToggleMemory,
  handleToggleTemplates,
  getLeadIdFromUrl,
  debugPanelOpen,
  setDebugPanelOpen
}) => {
  const leadIdFromUrl = getLeadIdFromUrl();
  const selectedConversation = conversations.find(conv => conv.leadId === selectedLead);

  // Get inbox operations
  const {
    canReply,
    handleSelectConversation,
    handleSendMessage
  } = useInboxOperations({
    user,
    loadMessages,
    sendMessage,
    sendingMessage,
    setError
  });

  // Handle conversation initialization
  useConversationInitialization({
    loading: false,
    isInitialized,
    filteredConversations: conversations,
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

  return (
    <>
      <InboxLayout
        conversations={conversations}
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
};

export default SmartInboxMain;
