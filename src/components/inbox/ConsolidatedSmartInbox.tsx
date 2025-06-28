
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import InboxLayout from './InboxLayout';
import { useConversationsList } from '@/hooks/conversation/useConversationsList';
import { useMessagesOperations } from '@/hooks/conversation/useMessagesOperations';
import { useMarkAsRead } from '@/hooks/useMarkAsRead';

interface ConsolidatedSmartInboxProps {
  onLeadsRefresh: () => void;
}

const ConsolidatedSmartInbox: React.FC<ConsolidatedSmartInboxProps> = ({
  onLeadsRefresh
}) => {
  const { profile } = useAuth();
  
  const { 
    conversations, 
    loading: conversationsLoading, 
    selectedLead, 
    setSelectedLead 
  } = useConversationsList();

  const { 
    messages, 
    sendMessage, 
    sendingMessage 
  } = useMessagesOperations(selectedLead);

  const { markAsRead, markingAsRead } = useMarkAsRead();

  const handleSelectConversation = async (leadId: string) => {
    setSelectedLead(leadId);
  };

  const handleSendMessage = async (message: string, isTemplate?: boolean) => {
    if (selectedLead) {
      await sendMessage(message, isTemplate);
    }
  };

  const canReply = (conversation: any) => {
    return conversation.lastMessageDirection === 'in' || conversation.unreadCount > 0;
  };

  const selectedConversation = conversations.find(conv => conv.leadId === selectedLead);

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg font-medium text-gray-700">Please log in to view your inbox.</p>
      </div>
    );
  }

  return (
    <InboxLayout
      conversations={conversations}
      messages={messages}
      selectedLead={selectedLead}
      selectedConversation={selectedConversation}
      showMemory={false}
      showTemplates={false}
      sendingMessage={sendingMessage}
      loading={conversationsLoading}
      user={{
        role: profile.role,
        id: profile.id
      }}
      onSelectConversation={handleSelectConversation}
      onSendMessage={handleSendMessage}
      onToggleTemplates={() => {}}
      canReply={canReply}
      markAsRead={markAsRead}
      markingAsRead={markingAsRead}
    />
  );
};

export default ConsolidatedSmartInbox;
