
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import ChatHeader from './ChatHeader';
import MessagesArea from './MessagesArea';
import ChatMessageInput from './ChatMessageInput';
import ChatAnalysisPanel from './ChatAnalysisPanel';
import LeadContextPanel from './LeadContextPanel';
import AIMessageGenerator from './AIMessageGenerator';
import IntelligentAIPanel from './IntelligentAIPanel';
import { useConversationAnalysis } from '@/hooks/useConversationAnalysis';

interface EnhancedChatViewProps {
  selectedConversation: any;
  messages: any[];
  onSendMessage: (message: string, isTemplate?: boolean) => void;
  showTemplates: boolean;
  onToggleTemplates: () => void;
  user: {
    role: string;
    id: string;
  };
}

const EnhancedChatView = ({ 
  selectedConversation, 
  messages, 
  onSendMessage, 
  showTemplates,
  onToggleTemplates,
  user 
}: EnhancedChatViewProps) => {
  const [newMessage, setNewMessage] = useState('');
  const [showLeadContext, setShowLeadContext] = useState(true);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const {
    summary,
    sentiments,
    suggestions,
    loading,
    updateSummary,
    loadExistingSummary,
    analyzeSentiment,
    loadSentiments,
    updateSuggestions,
    getSentimentForMessage,
    getAverageSentiment
  } = useConversationAnalysis(selectedConversation?.leadId || '');

  const handleScroll = () => {
    // Implementation for scroll handling would go here
    // This is a simplified version
    setShowScrollButton(Math.random() > 0.7); // Placeholder logic
  };

  const handleScrollToBottom = () => {
    setShowScrollButton(false);
  };

  // Load analysis data when conversation changes
  useEffect(() => {
    if (selectedConversation?.leadId) {
      loadExistingSummary();
      const conversationIds = messages.map(msg => msg.id);
      if (conversationIds.length > 0) {
        loadSentiments(conversationIds);
      }
    }
  }, [selectedConversation?.leadId, messages.length, loadExistingSummary, loadSentiments]);

  const handleSend = async () => {
    if (newMessage.trim() && !isSending) {
      setIsSending(true);
      try {
        console.log('📤 Sending message from chat view:', newMessage.trim());
        await onSendMessage(newMessage.trim());
        setNewMessage('');
        
        // Update analysis after sending
        setTimeout(() => {
          updateSummary();
          updateSuggestions();
        }, 1000);
      } catch (error) {
        console.error('Error sending message:', error);
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAIGeneratedMessage = async (message: string) => {
    setIsSending(true);
    try {
      await onSendMessage(message, false);
      setShowAIGenerator(false);
      
      // Update analysis after AI message
      setTimeout(() => {
        updateSummary();
        updateSuggestions();
      }, 1000);
    } catch (error) {
      console.error('Error sending AI message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setNewMessage(suggestion);
  };

  const canReply = selectedConversation && (
    user.role === "manager" || 
    user.role === "admin" || 
    selectedConversation.salespersonId === user.id || 
    !selectedConversation.salespersonId
  );

  if (!selectedConversation) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">Select a conversation</h3>
          <p className="text-slate-500">Choose a conversation from the list to start messaging</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4 h-full">
      {/* Main Chat Area */}
      <div className={`${showLeadContext ? 'col-span-8' : 'col-span-12'} flex flex-col space-y-4`}>
        {/* Analysis Panels */}
        {showAnalysis && (
          <ChatAnalysisPanel
            leadId={selectedConversation.leadId}
            messageCount={messages.length}
            canReply={canReply}
            onSummaryUpdate={updateSummary}
            onSelectSuggestion={handleSelectSuggestion}
          />
        )}

        {/* Intelligent AI Panel */}
        {canReply && (
          <IntelligentAIPanel
            conversation={selectedConversation}
            messages={messages}
            onSendMessage={handleAIGeneratedMessage}
            canReply={canReply}
          />
        )}

        {/* AI Message Generator */}
        {showAIGenerator && canReply && (
          <AIMessageGenerator
            leadId={selectedConversation.leadId}
            onSendMessage={handleAIGeneratedMessage}
            onClose={() => setShowAIGenerator(false)}
          />
        )}

        <Card className="flex-1 flex flex-col">
          <ChatHeader
            selectedConversation={selectedConversation}
            showAnalysis={showAnalysis}
            showLeadContext={showLeadContext}
            averageSentiment={getAverageSentiment()}
            onToggleAnalysis={() => setShowAnalysis(!showAnalysis)}
            onToggleLeadContext={() => setShowLeadContext(!showLeadContext)}
          />

          <MessagesArea
            messages={messages}
            showScrollButton={showScrollButton}
            getSentimentForMessage={getSentimentForMessage}
            onScroll={handleScroll}
            onScrollToBottom={handleScrollToBottom}
          />

          <ChatMessageInput
            newMessage={newMessage}
            isSending={isSending}
            canReply={canReply}
            onMessageChange={setNewMessage}
            onSend={handleSend}
            onKeyPress={handleKeyPress}
            onToggleAI={() => setShowAIGenerator(!showAIGenerator)}
            onToggleTemplates={onToggleTemplates}
          />
        </Card>
      </div>

      {/* Lead Context Panel */}
      {showLeadContext && (
        <div className="col-span-4">
          <LeadContextPanel conversation={selectedConversation} />
        </div>
      )}
    </div>
  );
};

export default EnhancedChatView;
