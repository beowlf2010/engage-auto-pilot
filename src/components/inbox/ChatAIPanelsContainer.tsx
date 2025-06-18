
import React from 'react';
import ChatAnalysisPanel from './ChatAnalysisPanel';
import IntelligentAIPanel from './IntelligentAIPanel';
import AIMessageGenerator from './AIMessageGenerator';

interface ChatAIPanelsContainerProps {
  showAnalysis: boolean;
  showAIPanel: boolean;
  showAIGenerator: boolean;
  canReply: boolean;
  selectedConversation: any;
  messages: any[];
  onSummaryUpdate: () => void;
  onSelectSuggestion: (suggestion: string) => void;
  onToggleAIPanel: () => void;
  onSendAIMessage: (message: string) => Promise<void>;
  onCloseAIGenerator: () => void;
}

const ChatAIPanelsContainer = ({
  showAnalysis,
  showAIPanel,
  showAIGenerator,
  canReply,
  selectedConversation,
  messages,
  onSummaryUpdate,
  onSelectSuggestion,
  onToggleAIPanel,
  onSendAIMessage,
  onCloseAIGenerator
}: ChatAIPanelsContainerProps) => {
  return (
    <>
      {/* Compact AI Panels - Only show when needed */}
      {showAnalysis && (
        <ChatAnalysisPanel
          leadId={selectedConversation.leadId}
          messageCount={messages.length}
          canReply={canReply}
          onSummaryUpdate={onSummaryUpdate}
          onSelectSuggestion={onSelectSuggestion}
        />
      )}

      {/* Collapsible Intelligent AI Panel */}
      {canReply && (
        <IntelligentAIPanel
          conversation={selectedConversation}
          messages={messages}
          onSendMessage={onSendAIMessage}
          canReply={canReply}
          isCollapsed={!showAIPanel}
          onToggleCollapse={onToggleAIPanel}
        />
      )}

      {/* AI Message Generator */}
      {showAIGenerator && canReply && (
        <AIMessageGenerator
          leadId={selectedConversation.leadId}
          onSendMessage={onSendAIMessage}
          onClose={onCloseAIGenerator}
        />
      )}
    </>
  );
};

export default ChatAIPanelsContainer;
