
import { useCallback } from 'react';
import { useSearchParams } from "react-router-dom";
import { assignCurrentUserToLead } from "@/services/conversationsService";
import { toast } from "@/hooks/use-toast";
import type { ConversationListItem } from '@/hooks/conversation/conversationTypes';

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
  const [searchParams] = useSearchParams();

  const canReply = useCallback((conv: any) => {
    // Managers and admins can reply to any conversation
    if (user.role === "manager" || user.role === "admin") return true;
    
    // Sales users can reply to their own leads or unassigned leads
    return conv.salespersonId === user.id || !conv.salespersonId;
  }, [user.role, user.id]);

  const handleSelectConversation = useCallback(async (leadId: string) => {
    try {
      console.log('📱 [SMART INBOX] Selecting conversation for lead:', leadId);
      setError(null); // Clear any previous errors
      
      // Load messages using stable operations
      await loadMessages(leadId);
      
      console.log('✅ [SMART INBOX] Conversation selected and messages loaded');
    } catch (err) {
      console.error('Error selecting conversation:', err);
      toast({
        title: "Error",
        description: "Failed to load messages for this conversation.",
        variant: "destructive"
      });
    }
  }, [loadMessages, setError]);

  const handleSendMessage = useCallback(async (
    selectedLead: string | null,
    selectedConversation: ConversationListItem | undefined,
    message: string,
    isTemplate?: boolean
  ) => {
    if (selectedLead && selectedConversation) {
      try {
        console.log('📤 [SMART INBOX] Sending message:', message);
        
        // Prevent multiple sends
        if (sendingMessage) {
          console.log('⏳ [SMART INBOX] Already sending, ignoring request');
          return;
        }
        
        // Auto-assign lead if it's unassigned and user can reply
        if (!selectedConversation.salespersonId && canReply(selectedConversation)) {
          console.log(`🎯 [SMART INBOX] Auto-assigning lead ${selectedLead} to user ${user.id}`);
          
          const assigned = await assignCurrentUserToLead(selectedLead, user.id);
          if (assigned) {
            toast({
              title: "Lead Assigned",
              description: "This lead has been assigned to you",
            });
            
            // Update the conversation object locally
            selectedConversation.salespersonId = user.id;
          }
        }
        
        // Use stable send message function
        await sendMessage(selectedLead, message);
        
        toast({
          title: "Message sent",
          description: "Your message has been sent successfully.",
        });
        
        console.log('✅ [SMART INBOX] Message sent successfully');
        
      } catch (err) {
        console.error('❌ [SMART INBOX] Error sending message:', err);
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Failed to send message. Please try again.",
          variant: "destructive"
        });
      }
    }
  }, [canReply, sendMessage, sendingMessage, user.id]);

  const getLeadIdFromUrl = useCallback(() => {
    return searchParams.get('leadId');
  }, [searchParams]);

  return {
    canReply,
    handleSelectConversation,
    handleSendMessage,
    getLeadIdFromUrl
  };
};
