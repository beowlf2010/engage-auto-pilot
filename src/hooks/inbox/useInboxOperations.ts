
import { useCallback, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import type { ConversationListItem } from '@/types/conversation';

interface UseInboxOperationsProps {
  user: {
    role: string;
    id: string;
  };
  loadMessages: (leadId: string) => Promise<void>;
  sendMessage: (leadId: string, message: string) => Promise<void>;
  sendingMessage: boolean;
  setError: (error: string | null) => void;
}

export const useInboxOperations = ({
  user,
  loadMessages,
  sendMessage,
  sendingMessage,
  setError
}: UseInboxOperationsProps) => {
  const loadingMessagesRef = useRef(false);

  // Check if user can reply to conversation
  const canReply = useCallback((conversation: ConversationListItem) => {
    if (user.role === "manager" || user.role === "admin") {
      return true;
    }
    return conversation.salespersonId === user.id || !conversation.salespersonId;
  }, [user.role, user.id]);

  // Handle conversation selection with loading protection
  const handleSelectConversation = useCallback(async (leadId: string) => {
    if (loadingMessagesRef.current) {
      console.log('⏳ [INBOX OPS] Messages already loading, skipping selection');
      return;
    }

    try {
      loadingMessagesRef.current = true;
      console.log('📬 [INBOX OPS] Loading messages for conversation:', leadId);
      
      await loadMessages(leadId);
      
      console.log('✅ [INBOX OPS] Messages loaded successfully');
    } catch (error) {
      console.error('❌ [INBOX OPS] Failed to load messages:', error);
      setError('Failed to load messages for this conversation');
    } finally {
      loadingMessagesRef.current = false;
    }
  }, [loadMessages, setError]);

  // Enhanced message sending with proper reloading
  const handleSendMessage = useCallback(async (
    leadId: string | null,
    selectedConversation: ConversationListItem | undefined,
    message: string,
    isTemplate?: boolean
  ) => {
    if (!leadId) {
      throw new Error('No conversation selected');
    }

    if (!selectedConversation) {
      throw new Error('Selected conversation not found');
    }

    if (!canReply(selectedConversation)) {
      throw new Error('You do not have permission to reply to this conversation');
    }

    if (sendingMessage) {
      console.log('⏳ [INBOX OPS] Already sending message, ignoring');
      return;
    }

    try {
      console.log('📤 [INBOX OPS] Sending message to lead:', leadId);
      
      // Send the message
      await sendMessage(leadId, message.trim());
      
      // Immediately reload messages to show the new message
      console.log('🔄 [INBOX OPS] Reloading messages after send...');
      await loadMessages(leadId);
      
      console.log('✅ [INBOX OPS] Message sent and conversation reloaded');
      
    } catch (error) {
      console.error('❌ [INBOX OPS] Message send failed:', error);
      throw error;
    }
  }, [leadId, canReply, sendingMessage, sendMessage, loadMessages]);

  return {
    canReply,
    handleSelectConversation,
    handleSendMessage
  };
};
