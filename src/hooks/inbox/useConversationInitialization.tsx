
import { useEffect } from 'react';
import type { ConversationListItem } from '@/hooks/conversation/conversationTypes';

interface UseConversationInitializationProps {
  loading: boolean;
  isInitialized: boolean;
  filteredConversations: ConversationListItem[];
  selectedLead: string | null;
  leadIdFromUrl: string | null;
  onSelectConversation: (leadId: string) => Promise<void>;
  setIsInitialized: (initialized: boolean) => void;
}

export const useConversationInitialization = ({
  loading,
  isInitialized,
  filteredConversations,
  selectedLead,
  leadIdFromUrl,
  onSelectConversation,
  setIsInitialized
}: UseConversationInitializationProps) => {
  // Handle pre-selection from URL parameter - only run once after conversations load
  useEffect(() => {
    if (loading || isInitialized || filteredConversations.length === 0) return;

    console.log('🔗 [SMART INBOX] URL leadId:', leadIdFromUrl);
    console.log('📊 [SMART INBOX] Available conversations:', filteredConversations.length);

    if (leadIdFromUrl) {
      const conversation = filteredConversations.find(conv => conv.leadId === leadIdFromUrl);
      if (conversation) {
        console.log('✅ [SMART INBOX] Found conversation for URL leadId, selecting...');
        onSelectConversation(leadIdFromUrl);
        setIsInitialized(true);
        return;
      } else {
        console.log('❌ [SMART INBOX] Lead from URL not found in conversations');
      }
    }

    // Default selection if no URL parameter or conversation not found
    if (filteredConversations.length > 0 && !selectedLead) {
      const firstConv = filteredConversations[0];
      console.log('📌 [SMART INBOX] Selecting first conversation:', firstConv.leadId);
      onSelectConversation(firstConv.leadId);
    }
    
    setIsInitialized(true);
  }, [loading, isInitialized, filteredConversations, selectedLead, leadIdFromUrl, onSelectConversation, setIsInitialized]);
};
