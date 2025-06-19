
import React from 'react';
import ConversationsList from './ConversationsList';
import EnhancedChatView from './EnhancedChatView';
import ConversationMemory from '../ConversationMemory';
import type { ConversationListItem, MessageData } from '@/hooks/conversation/conversationTypes';

interface InboxLayoutProps {
  conversations: ConversationListItem[];
  messages: MessageData[];
  selectedLead: string | null;
  selectedConversation: ConversationListItem | undefined;
  showMemory: boolean;
  showTemplates: boolean;
  sendingMessage: boolean;
  user: {
    role: string;
    id: string;
  };
  onSelectConversation: (leadId: string) => Promise<void>;
  onSendMessage: (message: string, isTemplate?: boolean) => Promise<void>;
  onToggleTemplates: () => void;
  canReply: (conv: any) => boolean;
}

const InboxLayout: React.FC<InboxLayoutProps> = ({
  conversations,
  messages,
  selectedLead,
  selectedConversation,
  showMemory,
  showTemplates,
  sendingMessage,
  user,
  onSelectConversation,
  onSendMessage,
  onToggleTemplates,
  canReply
}) => {
  return (
    <div className="h-[calc(100vh-8rem)] flex space-x-4">
      {/* Conversations list with reasonable width */}
      <div className="w-80 flex-shrink-0 relative">
        <ConversationsList
          conversations={conversations}
          selectedLead={selectedLead}
          onSelectConversation={onSelectConversation}
          canReply={canReply}
        />
      </div>

      {/* Chat area takes remaining width */}
      <div className="flex-1 min-w-0">
        <EnhancedChatView
          selectedConversation={selectedConversation}
          messages={messages}
          onSendMessage={onSendMessage}
          showTemplates={showTemplates}
          onToggleTemplates={onToggleTemplates}
          user={user}
          isLoading={sendingMessage}
        />
      </div>

      {showMemory && selectedLead && (
        <ConversationMemory leadId={parseInt(selectedLead)} />
      )}
    </div>
  );
};

export default InboxLayout;
