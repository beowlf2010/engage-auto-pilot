
import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import ChatContainer from './ChatContainer';
import ChatAIPanelsContainer from './ChatAIPanelsContainer';
import LeadContextPanel from './LeadContextPanel';
import AppointmentScheduler from '../appointments/AppointmentScheduler';
import { useChatState } from './hooks/useChatState';
import { useChatHandlers } from './hooks/useChatHandlers';
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
  const [showAppointmentScheduler, setShowAppointmentScheduler] = useState(false);
  
  const chatState = useChatState();
  const {
    newMessage,
    setNewMessage,
    showLeadContext,
    setShowLeadContext,
    showAIGenerator,
    setShowAIGenerator,
    showAnalysis,
    setShowAnalysis,
    showAIPanel,
    setShowAIPanel,
    isSending,
    setIsSending,
    showScrollButton,
    setShowScrollButton
  } = chatState;

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

  const chatHandlers = useChatHandlers({
    newMessage,
    setNewMessage,
    setIsSending,
    setShowAIGenerator,
    setShowScrollButton,
    onSendMessage,
    updateSummary,
    updateSuggestions,
    isSending
  });

  const {
    handleScroll,
    handleScrollToBottom,
    handleSend,
    handleKeyPress,
    handleAIGeneratedMessage,
    handleSelectSuggestion
  } = chatHandlers;

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

  const canReply = selectedConversation && (
    user.role === "manager" || 
    user.role === "admin" || 
    selectedConversation.salespersonId === user.id || 
    !selectedConversation.salespersonId
  );

  const handleScheduleAppointment = () => {
    setShowAppointmentScheduler(true);
  };

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

  const leadName = `${selectedConversation.leadName || 'Unknown Lead'}`;

  return (
    <>
      <div className="grid grid-cols-12 gap-4 h-full">
        {/* Main Chat Area - Fixed Height */}
        <div className={`${showLeadContext ? 'col-span-8' : 'col-span-12'} flex flex-col space-y-2`}>
          <ChatAIPanelsContainer
            showAnalysis={showAnalysis}
            showAIPanel={showAIPanel}
            showAIGenerator={showAIGenerator}
            canReply={canReply}
            selectedConversation={selectedConversation}
            messages={messages}
            onSummaryUpdate={updateSummary}
            onSelectSuggestion={handleSelectSuggestion}
            onToggleAIPanel={() => setShowAIPanel(!showAIPanel)}
            onSendAIMessage={handleAIGeneratedMessage}
            onCloseAIGenerator={() => setShowAIGenerator(false)}
          />

          <ChatContainer
            selectedConversation={selectedConversation}
            messages={messages}
            newMessage={newMessage}
            isSending={isSending}
            canReply={canReply}
            showAnalysis={showAnalysis}
            showLeadContext={showLeadContext}
            showScrollButton={showScrollButton}
            averageSentiment={getAverageSentiment()}
            getSentimentForMessage={getSentimentForMessage}
            onMessageChange={setNewMessage}
            onSend={handleSend}
            onKeyPress={handleKeyPress}
            onToggleAnalysis={() => setShowAnalysis(!showAnalysis)}
            onToggleLeadContext={() => setShowLeadContext(!showLeadContext)}
            onToggleAI={() => setShowAIGenerator(!showAIGenerator)}
            onToggleTemplates={onToggleTemplates}
            onScroll={handleScroll}
            onScrollToBottom={handleScrollToBottom}
            onScheduleAppointment={handleScheduleAppointment}
          />
        </div>

        {/* Lead Context Panel */}
        {showLeadContext && (
          <div className="col-span-4">
            <LeadContextPanel 
              conversation={selectedConversation}
              onScheduleAppointment={handleScheduleAppointment}
            />
          </div>
        )}
      </div>

      {/* Appointment Scheduler Dialog */}
      <AppointmentScheduler
        isOpen={showAppointmentScheduler}
        onClose={() => setShowAppointmentScheduler(false)}
        leadId={selectedConversation.leadId}
        leadName={leadName}
      />
    </>
  );
};

export default EnhancedChatView;
