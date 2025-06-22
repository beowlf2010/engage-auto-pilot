
import React, { useRef } from 'react';
import { useInboxOperations } from '@/hooks/inbox/useInboxOperations';
import { useConversationInitialization } from '@/hooks/inbox/useConversationInitialization';
import InboxLayout from './InboxLayout';
import MessageDebugPanel from '../debug/MessageDebugPanel';
import { toast } from '@/hooks/use-toast';
import type { ConversationListItem, MessageData } from '@/types/conversation';

interface SmartInboxMainProps {
  user: {
    role: string;
    id: string;
  };
  conversations: ConversationListItem[];
  messages: MessageData[];
  sendingMessage: boolean;
  loading: boolean;
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
  markAsRead: (leadId: string) => Promise<void>;
  markingAsRead: string | null;
}

const SmartInboxMain: React.FC<SmartInboxMainProps> = ({
  user,
  conversations,
  messages,
  sendingMessage,
  loading,
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
  setDebugPanelOpen,
  markAsRead,
  markingAsRead
}) => {
  const leadIdFromUrl = getLeadIdFromUrl();
  const selectedConversation = conversations.find(conv => conv.leadId === selectedLead);
  const isSelectingRef = useRef(false);
  const loadingMessagesRef = useRef(false);

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

  // Enhanced conversation selection with guards
  const handleSimpleSelectConversation = React.useCallback(async (leadId: string) => {
    // Prevent multiple simultaneous selections
    if (isSelectingRef.current || loadingMessagesRef.current) {
      console.log('⏳ [SMART INBOX] Selection already in progress, ignoring');
      return;
    }

    // Don't re-select the same conversation
    if (selectedLead === leadId) {
      console.log('✅ [SMART INBOX] Conversation already selected:', leadId);
      return;
    }

    console.log('📱 [SMART INBOX] Selecting conversation for lead:', leadId);
    
    try {
      isSelectingRef.current = true;
      loadingMessagesRef.current = true;
      
      // Set selected lead first
      setSelectedLead(leadId);
      
      // Load messages
      await handleSelectConversation(leadId);
      
      console.log('✅ [SMART INBOX] Conversation selected and messages loaded');
    } catch (error) {
      console.error('❌ [SMART INBOX] Selection failed:', error);
      toast({
        title: "Error selecting conversation",
        description: "Failed to load messages for this conversation.",
        variant: "destructive"
      });
    } finally {
      isSelectingRef.current = false;
      loadingMessagesRef.current = false;
    }
  }, [selectedLead, setSelectedLead, handleSelectConversation]);

  // Handle conversation initialization with proper loading coordination
  useConversationInitialization({
    loading,
    isInitialized,
    filteredConversations: conversations,
    selectedLead,
    leadIdFromUrl,
    onSelectConversation: handleSimpleSelectConversation,
    setIsInitialized
  });

  // Enhanced message sending with automatic conversation reload
  const onSendMessage = async (message: string, isTemplate?: boolean) => {
    if (sendingMessage) {
      console.log('⏳ [SMART INBOX] Already sending message, ignoring');
      return;
    }

    try {
      console.log('📤 [SMART INBOX] Starting message send process...');
      
      await handleSendMessage(selectedLead, selectedConversation, message, isTemplate);
      
      if (isTemplate) {
        handleToggleTemplates();
      }
      
      console.log('✅ [SMART INBOX] Message sent and conversation updated');
      
    } catch (error) {
      console.error('❌ [SMART INBOX] Send message error:', error);
      
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
        loading={loading}
        user={user}
        onSelectConversation={handleSimpleSelectConversation}
        onSendMessage={onSendMessage}
        onToggleTemplates={handleToggleTemplates}
        canReply={canReply}
        markAsRead={markAsRead}
        markingAsRead={markingAsRead}
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
