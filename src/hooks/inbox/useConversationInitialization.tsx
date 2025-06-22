
import { useEffect } from 'react';
import type { ConversationListItem } from '@/types/conversation';

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
  // Handle initialization only once when conversations are loaded
  useEffect(() => {
    // Don't initialize if already done, still loading, or no conversations
    if (isInitialized || loading || filteredConversations.length === 0) {
      return;
    }

    console.log('🔗 [INBOX INIT] Starting conversation initialization');
    console.log('🔗 [INBOX INIT] URL leadId:', leadIdFromUrl);
    console.log('📊 [INBOX INIT] Available conversations:', filteredConversations.length);

    // If we have a lead ID from URL, try to select it
    if (leadIdFromUrl) {
      const conversation = filteredConversations.find(conv => conv.leadId === leadIdFromUrl);
      if (conversation) {
        console.log('✅ [INBOX INIT] Found conversation for URL leadId, selecting...');
        onSelectConversation(leadIdFromUrl);
        setIsInitialized(true);
        return;
      } else {
        console.log('❌ [INBOX INIT] Lead from URL not found in conversations');
      }
    }

    // Default to first conversation if no selected lead or URL lead not found
    if (!selectedLead && filteredConversations.length > 0) {
      const firstConv = filteredConversations[0];
      console.log('📌 [INBOX INIT] Selecting first conversation:', firstConv.leadId);
      onSelectConversation(firstConv.leadId);
    }
    
    setIsInitialized(true);
  }, [loading, isInitialized, filteredConversations.length, selectedLead, leadIdFromUrl]);
};
