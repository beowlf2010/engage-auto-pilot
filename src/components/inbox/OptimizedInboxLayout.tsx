
import React from 'react';
import VirtualConversationList from './VirtualConversationList';
import EnhancedChatView from './EnhancedChatView';
import ConversationMemory from '../ConversationMemory';
import type { ConversationListItem, MessageData } from '@/types/conversation';

interface OptimizedInboxLayoutProps {
  conversations: ConversationListItem[];
  messages: MessageData[];
  selectedLead: string | null;
  selectedConversation: ConversationListItem | undefined;
  showMemory: boolean;
  showTemplates: boolean;
  sendingMessage: boolean;
  loading: boolean;
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
  
  // Enhanced real-time props
  connectionState?: any;
  optimisticMessages?: Map<string, MessageData[]>;
  onRetryMessage?: (messageId: string) => void;
  isConnected?: boolean;
}

const OptimizedInboxLayout: React.FC<OptimizedInboxLayoutProps> = ({
  selectedLead,
  selectedConversation,
  messages,
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
  markingAsRead,
  connectionState,
  optimisticMessages,
  onRetryMessage,
  isConnected = true
}) => {
  return (
    <div className="h-[calc(100vh-8rem)] flex space-x-4">
      {/* Virtual scrolling conversations list */}
      <div className="w-80 flex-shrink-0">
        <VirtualConversationList
          selectedLead={selectedLead}
          onSelectConversation={onSelectConversation}
          canReply={canReply}
          markAsRead={markAsRead}
          markingAsRead={markingAsRead}
          loading={loading}
          // Pass connection state for real-time indicators
          isConnected={isConnected}
          optimisticMessages={optimisticMessages}
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
          // Enhanced real-time props
          connectionState={connectionState}
          onRetryMessage={onRetryMessage}
          isConnected={isConnected}
        />
      </div>

      {/* Memory panel */}
      {showMemory && selectedLead && (
        <ConversationMemory leadId={parseInt(selectedLead)} />
      )}
    </div>
  );
};

export default OptimizedInboxLayout;
