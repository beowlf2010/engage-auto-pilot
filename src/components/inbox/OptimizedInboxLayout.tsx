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
  return (
    <div className="flex h-full">
      {/* Conversations List */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        <ConversationsList
          conversations={conversations}
          selectedLead={selectedLead}
          onSelectConversation={onSelectConversation}
          markAsRead={markAsRead}
          markingAsRead={markingAsRead}
          canReply={(conversation) => canReply}
        />
      </div>

      {/* Chat View - Remove canReply prop that doesn't exist */}
      <div className="flex-1 flex flex-col">
        <EnhancedChatView
          messages={messages}
          selectedConversation={selectedConversation}
          showTemplates={showTemplates}
          onSendMessage={onSendMessage}
          onToggleTemplates={onToggleTemplates}
          user={user}
        />
      </div>

      {/* Lead Context Panel - Use conversation prop structure */}
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
          />
        </div>
      )}
    </div>
  );
};

export default OptimizedInboxLayout;
