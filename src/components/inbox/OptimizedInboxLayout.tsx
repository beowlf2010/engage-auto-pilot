
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
  
  // Enhanced predictive props
  searchQuery?: string;
  searchResults?: ConversationListItem[];
  predictions?: any[];
  onSearch?: (query: string) => void;
  messagesLoading?: boolean;
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
  isConnected = true,
  searchQuery,
  searchResults,
  predictions,
  onSearch,
  messagesLoading = false
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
          // Enhanced real-time props
          isConnected={isConnected}
          optimisticMessages={optimisticMessages}
          // Enhanced predictive props
          searchQuery={searchQuery}
          searchResults={searchResults}
          predictions={predictions}
          onSearch={onSearch}
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
          messagesLoading={messagesLoading}
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
