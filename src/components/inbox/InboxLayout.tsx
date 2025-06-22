
import React from 'react';
import EnhancedInboxTabs from './EnhancedInboxTabs';
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
  markAsRead: (leadId: string) => Promise<void>;
  markingAsRead: string | null;
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
  canReply,
  markAsRead,
  markingAsRead
}) => {
  return (
    <div className="h-[calc(100vh-8rem)] flex space-x-4">
      {/* Enhanced conversations list with tabs - reasonable width */}
      <div className="w-80 flex-shrink-0 relative">
        <EnhancedInboxTabs
          conversations={conversations}
          selectedLead={selectedLead}
          onSelectConversation={onSelectConversation}
          canReply={canReply}
          markAsRead={markAsRead}
          markingAsRead={markingAsRead}
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
