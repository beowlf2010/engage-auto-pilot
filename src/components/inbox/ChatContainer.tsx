
import React from 'react';
import { Card } from '@/components/ui/card';
import ChatHeader from './ChatHeader';
import MessagesArea from './MessagesArea';
import ChatMessageInput from './ChatMessageInput';

interface ChatContainerProps {
  selectedConversation: any;
  messages: any[];
  newMessage: string;
  isSending: boolean;
  canReply: boolean;
  showAnalysis: boolean;
  showLeadContext: boolean;
  showScrollButton: boolean;
  averageSentiment: number;
  getSentimentForMessage: (messageId: string) => any;
  onMessageChange: (message: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onToggleAnalysis: () => void;
  onToggleLeadContext: () => void;
  onToggleAI: () => void;
  onToggleTemplates: () => void;
  onScroll: () => void;
  onScrollToBottom: () => void;
}

const ChatContainer = ({
  selectedConversation,
  messages,
  newMessage,
  isSending,
  canReply,
  showAnalysis,
  showLeadContext,
  showScrollButton,
  averageSentiment,
  getSentimentForMessage,
  onMessageChange,
  onSend,
  onKeyPress,
  onToggleAnalysis,
  onToggleLeadContext,
  onToggleAI,
  onToggleTemplates,
  onScroll,
  onScrollToBottom
}: ChatContainerProps) => {
  return (
    <Card className="flex flex-col h-full">
      <ChatHeader
        selectedConversation={selectedConversation}
        showAnalysis={showAnalysis}
        showLeadContext={showLeadContext}
        averageSentiment={averageSentiment}
        onToggleAnalysis={onToggleAnalysis}
        onToggleLeadContext={onToggleLeadContext}
      />

      <MessagesArea
        messages={messages}
        showScrollButton={showScrollButton}
        getSentimentForMessage={getSentimentForMessage}
        onScroll={onScroll}
        onScrollToBottom={onScrollToBottom}
      />

      <ChatMessageInput
        newMessage={newMessage}
        isSending={isSending}
        canReply={canReply}
        onMessageChange={onMessageChange}
        onSend={onSend}
        onKeyPress={onKeyPress}
        onToggleAI={onToggleAI}
        onToggleTemplates={onToggleTemplates}
      />
    </Card>
  );
};

export default ChatContainer;
