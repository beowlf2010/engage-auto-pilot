
import React, { useEffect, useState } from 'react';
import { useDebugMessageLoader } from '@/hooks/useDebugMessageLoader';
import ConversationView from './ConversationView';
import MessageDebugPanel from './MessageDebugPanel';
import type { ConversationListItem } from '@/types/conversation';

interface ConversationViewWithDebugProps {
  conversation: ConversationListItem;
  onBack: () => void;
  onSendMessage: (message: string) => Promise<void>;
  sending: boolean;
  onMarkAsRead: () => Promise<void>;
  canReply: boolean;
}

const ConversationViewWithDebug: React.FC<ConversationViewWithDebugProps> = (props) => {
  const { conversation } = props;
  const [showDebug, setShowDebug] = useState(false);
  
  const {
    messages,
    debugState,
    validateAndLoadMessages,
    getDebugInfo,
    clearDebugLogs,
    forceReload
  } = useDebugMessageLoader();

  // Auto-enable debug mode if there's a potential mismatch
  useEffect(() => {
    if (conversation.unreadCount > 0 && messages.length === 0) {
      console.log('🚨 [CONVERSATION DEBUG] Potential mismatch detected - enabling debug mode');
      setShowDebug(true);
    }
  }, [conversation.unreadCount, messages.length]);

  // Load messages when conversation changes
  useEffect(() => {
    if (conversation.leadId) {
      console.log(`🔄 [CONVERSATION DEBUG] Loading messages for lead: ${conversation.leadId}`);
      console.log(`📊 [CONVERSATION DEBUG] Expected unread count: ${conversation.unreadCount}`);
      
      validateAndLoadMessages(conversation.leadId, { method: 'conversation_view' });
    }
  }, [conversation.leadId, validateAndLoadMessages]);

  const handleForceReload = async () => {
    if (conversation.leadId) {
      console.log(`🔄 [CONVERSATION DEBUG] Force reloading messages for lead: ${conversation.leadId}`);
      await forceReload(conversation.leadId);
    }
  };

  const debugInfo = getDebugInfo();

  // Check for mismatches
  const hasPotentialMismatch = conversation.unreadCount > 0 && messages.length === 0;
  const hasValidationErrors = debugState.validationResult?.validationErrors?.length > 0;

  return (
    <div className="h-full flex flex-col">
      {/* Debug Panel - show if debug mode enabled or mismatch detected */}
      {(showDebug || hasPotentialMismatch || hasValidationErrors) && (
        <div className="p-2 border-b">
          <MessageDebugPanel
            debugInfo={debugInfo}
            onForceReload={handleForceReload}
            onClearLogs={clearDebugLogs}
            leadId={conversation.leadId}
          />
        </div>
      )}

      {/* Main Conversation View */}
      <div className="flex-1">
        <ConversationView
          {...props}
          messages={messages.map(msg => ({
            id: msg.id,
            body: msg.body,
            direction: msg.direction,
            sent_at: msg.sentAt,
            read_at: undefined, // ConversationView expects different format
            ai_generated: msg.aiGenerated
          }))}
          loading={debugState.isLoading}
          error={debugState.error}
        />
      </div>

      {/* Debug Toggle for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="p-2 border-t bg-gray-50">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="text-xs text-gray-600 hover:text-gray-800"
          >
            {showDebug ? 'Hide' : 'Show'} Debug Panel
          </button>
        </div>
      )}
    </div>
  );
};

export default ConversationViewWithDebug;
