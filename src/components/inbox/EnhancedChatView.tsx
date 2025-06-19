
import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import ChatAIPanelsContainer from './ChatAIPanelsContainer';
import LeadContextPanel from './LeadContextPanel';
import AppointmentScheduler from '../appointments/AppointmentScheduler';
import AppointmentInterestBanner from './AppointmentInterestBanner';
import { useChatState } from './hooks/useChatState';
import { useChatHandlers } from './hooks/useChatHandlers';
import { useConversationAnalysis } from '@/hooks/useConversationAnalysis';
import { analyzeAppointmentIntent, logAppointmentIntent } from '@/services/appointmentIntentService';
import type { AppointmentIntent } from '@/services/appointmentIntentService';

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
  const [appointmentIntent, setAppointmentIntent] = useState<AppointmentIntent | null>(null);
  const [showAppointmentBanner, setShowAppointmentBanner] = useState(false);
  
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

  // Analyze appointment intent when messages change
  useEffect(() => {
    if (messages.length > 0 && selectedConversation?.leadId) {
      const intent = analyzeAppointmentIntent(messages);
      setAppointmentIntent(intent);
      
      // Show banner if appointment intent detected and not already showing scheduler
      if (intent.hasAppointmentIntent && !showAppointmentScheduler) {
        setShowAppointmentBanner(true);
        
        // Log the intent detection
        const lastMessage = messages.filter(msg => msg.direction === 'in').slice(-1)[0];
        if (lastMessage) {
          logAppointmentIntent(selectedConversation.leadId, intent, lastMessage.id);
        }
      }
    }
  }, [messages, selectedConversation?.leadId, showAppointmentScheduler]);

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
    setShowAppointmentBanner(false);
  };

  const handleDismissAppointmentBanner = () => {
    setShowAppointmentBanner(false);
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
          {/* Appointment Interest Banner */}
          {appointmentIntent && (
            <AppointmentInterestBanner
              isVisible={showAppointmentBanner}
              confidence={appointmentIntent.confidence}
              appointmentType={appointmentIntent.appointmentType}
              urgency={appointmentIntent.urgency}
              timePreferences={appointmentIntent.timePreferences}
              onScheduleAppointment={handleScheduleAppointment}
              onDismiss={handleDismissAppointmentBanner}
            />
          )}

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

          {/* Fixed Height Chat Display */}
          <Card className="flex-1 flex flex-col min-h-0 h-[500px]">
            <div className="flex-1 p-4 overflow-y-auto max-h-[400px]">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.direction === 'out' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.direction === 'out'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      {message.body}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Fixed Position Message Input */}
            {canReply && (
              <div className="border-t p-4 bg-white">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSending}
                  />
                  <button
                    onClick={handleSend}
                    disabled={isSending || !newMessage.trim()}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            )}
          </Card>
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
