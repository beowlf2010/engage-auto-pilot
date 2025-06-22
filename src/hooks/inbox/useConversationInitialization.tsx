
import { useEffect, useRef } from 'react';
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
  const hasInitializedRef = useRef(false);
  const initializingRef = useRef(false);
  const lastConversationCountRef = useRef(0);

  useEffect(() => {
    // Prevent multiple initialization attempts
    if (hasInitializedRef.current || initializingRef.current || loading) {
      return;
    }

    // Don't initialize if no conversations available
    if (filteredConversations.length === 0) {
      return;
    }

    // Don't re-initialize if already done and conversation count hasn't changed
    if (isInitialized && filteredConversations.length === lastConversationCountRef.current) {
      return;
    }

    console.log('🔗 [INBOX INIT] Starting one-time conversation initialization');
    console.log('🔗 [INBOX INIT] URL leadId:', leadIdFromUrl);
    console.log('📊 [INBOX INIT] Available conversations:', filteredConversations.length);

    initializingRef.current = true;

    const initializeConversation = async () => {
      try {
        let targetLeadId: string | null = null;

        // Priority 1: Lead ID from URL if valid
        if (leadIdFromUrl) {
          const urlConversation = filteredConversations.find(conv => conv.leadId === leadIdFromUrl);
          if (urlConversation) {
            console.log('✅ [INBOX INIT] Found conversation for URL leadId, selecting...');
            targetLeadId = leadIdFromUrl;
          } else {
            console.log('❌ [INBOX INIT] Lead from URL not found in conversations');
          }
        }

        // Priority 2: Currently selected lead if still valid
        if (!targetLeadId && selectedLead) {
          const selectedConversation = filteredConversations.find(conv => conv.leadId === selectedLead);
          if (selectedConversation) {
            console.log('✅ [INBOX INIT] Current selection still valid');
            targetLeadId = selectedLead;
          }
        }

        // Priority 3: First conversation as fallback
        if (!targetLeadId && filteredConversations.length > 0) {
          targetLeadId = filteredConversations[0].leadId;
          console.log('📌 [INBOX INIT] Selecting first conversation:', targetLeadId);
        }

        if (targetLeadId) {
          await onSelectConversation(targetLeadId);
          lastConversationCountRef.current = filteredConversations.length;
          hasInitializedRef.current = true;
          setIsInitialized(true);
          console.log('✅ [INBOX INIT] Initialization complete');
        }
      } catch (error) {
        console.error('❌ [INBOX INIT] Initialization failed:', error);
      } finally {
        initializingRef.current = false;
      }
    };

    // Small delay to ensure all data is settled
    const timeoutId = setTimeout(initializeConversation, 100);
    
    return () => {
      clearTimeout(timeoutId);
      initializingRef.current = false;
    };
  }, [loading, filteredConversations.length, leadIdFromUrl]); // Simplified dependencies

  // Reset initialization state when conversations change significantly
  useEffect(() => {
    if (filteredConversations.length === 0) {
      hasInitializedRef.current = false;
      lastConversationCountRef.current = 0;
      setIsInitialized(false);
    }
  }, [filteredConversations.length, setIsInitialized]);
};
