
import React from 'react';
import ConversationsList from './ConversationsList';
import EnhancedChatView from './EnhancedChatView';
import LeadContextPanel from './LeadContextPanel';
import type { ConversationListItem, MessageData } from '@/types/conversation';

interface OptimizedInboxLayoutProps {
  conversations: ConversationListItem[];
  messages: MessageData[];
  selectedLead: string | null;
  selectedConversation: ConversationListItem | null;
  showMemory: boolean;
  showTemplates: boolean;
  sendingMessage: boolean;
  loading: boolean;
  user: {
    role: string;
    id: string;
  };
  onSelectConversation: (leadId: string) => void;
  onSendMessage: (message: string, isTemplate?: boolean) => Promise<void>;
  onToggleTemplates: () => void;
  canReply: boolean;
  markAsRead: (leadId: string) => Promise<void>;
  markingAsRead: string | null;
}

const OptimizedInboxLayout: React.FC<OptimizedInboxLayoutProps> = ({
  conversations,
  messages,
  selectedLead,
  selectedConversation,
  showMemory,
  showTemplates,
  sendingMessage,
  loading,
  user,
  onSelectConversation,
  onSendMessage,
  onToggleTemplates,
  canReply,
  markAsRead,
  markingAsRead
}) => {
  // Create wrapper function to match expected signature
  const handleConversationSelect = (conversation: ConversationListItem) => {
    onSelectConversation(conversation.leadId);
  };

  return (
    <div className="flex h-full">
      {/* Conversations List */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        <ConversationsList
          conversations={conversations}
          selectedLead={selectedLead}
          onSelectConversation={handleConversationSelect}
          markAsRead={markAsRead}
          markingAsRead={markingAsRead}
          canReply={canReply}
        />
      </div>

      {/* Chat View */}
      <div className="flex-1 flex flex-col">
        <EnhancedChatView
          messages={messages}
          selectedConversation={selectedConversation}
          showTemplates={showTemplates}
          onSendMessage={onSendMessage}
          onToggleTemplates={onToggleTemplates}
          user={user}
          isLoading={sendingMessage}
        />
      </div>

      {/* Lead Context Panel */}
      {selectedConversation && (
        <div className="w-80 border-l border-gray-200">
          <LeadContextPanel
            conversation={{
              leadId: selectedConversation.leadId,
              leadName: selectedConversation.leadName,
              leadPhone: selectedConversation.primaryPhone,
              vehicleInterest: selectedConversation.vehicleInterest,
              status: selectedConversation.status,
              lastMessageTime: selectedConversation.lastMessageTime,
              salespersonId: selectedConversation.salespersonId
            }}
            messages={messages}
            onSendMessage={onSendMessage}
          />
        </div>
      )}
    </div>
  );
};

export default OptimizedInboxLayout;
