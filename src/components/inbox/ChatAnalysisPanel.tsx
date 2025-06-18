
import React from 'react';
import ConversationSummaryPanel from '../conversation/ConversationSummaryPanel';
import ResponseSuggestionsPanel from '../conversation/ResponseSuggestionsPanel';

interface ChatAnalysisPanelProps {
  leadId: string;
  messageCount: number;
  canReply: boolean;
  onSummaryUpdate: () => void;
  onSelectSuggestion: (suggestion: string) => void;
}

const ChatAnalysisPanel = ({
  leadId,
  messageCount,
  canReply,
  onSummaryUpdate,
  onSelectSuggestion
}: ChatAnalysisPanelProps) => {
  return (
    <div className="space-y-4">
      <ConversationSummaryPanel
        leadId={leadId}
        messageCount={messageCount}
        onSummaryUpdate={onSummaryUpdate}
      />
      <ResponseSuggestionsPanel
        leadId={leadId}
        onSelectSuggestion={onSelectSuggestion}
        isVisible={canReply}
      />
    </div>
  );
};

export default ChatAnalysisPanel;
