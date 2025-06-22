
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
        />
      </div>

      {/* Chat View */}
      <div className="flex-1 flex flex-col">
        <EnhancedChatView
          messages={messages}
          selectedConversation={selectedConversation}
          showMemory={showMemory}
          showTemplates={showTemplates}
          sendingMessage={sendingMessage}
          onSendMessage={onSendMessage}
          onToggleTemplates={onToggleTemplates}
          canReply={canReply}
          user={user}
        />
      </div>

      {/* Lead Context Panel */}
      {selectedConversation && (
        <div className="w-80 border-l border-gray-200">
          <LeadContextPanel
            lead={{
              id: selectedConversation.leadId,
              first_name: selectedConversation.leadName.split(' ')[0] || '',
              last_name: selectedConversation.leadName.split(' ').slice(1).join(' ') || '',
              phone: selectedConversation.primaryPhone,
              vehicle_interest: selectedConversation.vehicleInterest,
              status: selectedConversation.status,
              last_contact_date: selectedConversation.lastMessageTime,
              source: selectedConversation.source || 'unknown',
              created_at: selectedConversation.lastMessageTime,
              email: '',
              salesperson_id: selectedConversation.salespersonId || null,
              priority: selectedConversation.priority || 'normal'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default OptimizedInboxLayout;
