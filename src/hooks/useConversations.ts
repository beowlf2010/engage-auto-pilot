
import { useEffect } from 'react';
import { useConversationData } from './useConversationData';
import { useRealtimeChannels } from './useRealtimeChannels';

export const useConversations = () => {
  const {
    conversations,
    messages,
    loading,
    loadConversations,
    loadMessages,
    sendMessage,
    profile
  } = useConversationData();

  const {
    setupConversationChannel,
    setupMessageChannel,
    setCurrentLeadId,
    cleanupAllChannels
  } = useRealtimeChannels();

  const fetchMessages = async (leadId: string) => {
    await loadMessages(leadId);
    setCurrentLeadId(leadId);
    
    // Set up message channel for this specific lead
    setupMessageChannel(leadId, loadMessages);
  };

  // Setup conversation channel when profile is available
  useEffect(() => {
    if (profile) {
      setupConversationChannel(profile.id, loadConversations);
      loadConversations();
    }

    return () => {
      cleanupAllChannels();
    };
  }, [profile, setupConversationChannel, loadConversations, cleanupAllChannels]);

  return { 
    conversations, 
    messages, 
    loading, 
    fetchMessages, 
    sendMessage,
    refetch: loadConversations 
  };
};
