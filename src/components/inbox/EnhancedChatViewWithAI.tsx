
import React, { useEffect, useState } from 'react';
import { useContextualAI } from '@/hooks/useContextualAI';
import EnhancedChatView from './EnhancedChatView';
import AIInsightsPanel from '../ai/AIInsightsPanel';
import ContextualAssistancePanel from '../ai/ContextualAssistancePanel';
import { Button } from '@/components/ui/button';
import { Brain, ChevronRight, ChevronLeft } from 'lucide-react';

interface EnhancedChatViewWithAIProps {
  selectedConversation: any;
  messages: any[];
  onSendMessage: (message: string, isTemplate?: boolean) => Promise<void>;
  showTemplates: boolean;
  onToggleTemplates: () => void;
  user: any;
  isLoading: boolean;
  onThreadView?: () => void;
}

const EnhancedChatViewWithAI: React.FC<EnhancedChatViewWithAIProps> = ({
  selectedConversation,
  messages,
  onSendMessage,
  showTemplates,
  onToggleTemplates,
  user,
  isLoading,
  onThreadView
}) => {
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [aiPanelWidth, setAIPanelWidth] = useState(320);
  const { analyzeConversation } = useContextualAI(selectedConversation?.leadId || null);

  // Auto-analyze conversation when messages change
  useEffect(() => {
    if (selectedConversation && messages.length > 0) {
      const conversationHistory = messages
        .map(m => `${m.direction === 'in' ? 'Customer' : 'Agent'}: ${m.body}`)
        .join('\n');
      
      const latestMessage = messages[messages.length - 1];
      if (latestMessage?.direction === 'in') {
        analyzeConversation(conversationHistory, latestMessage.body);
      }
    }
  }, [messages, selectedConversation, analyzeConversation]);

  const handleSendMessage = async (message: string, isTemplate?: boolean) => {
    await onSendMessage(message, isTemplate);
    
    // Re-analyze after sending a message
    if (selectedConversation && messages.length > 0) {
      const conversationHistory = [...messages, { direction: 'out', body: message }]
        .map(m => `${m.direction === 'in' ? 'Customer' : 'Agent'}: ${m.body}`)
        .join('\n');
      
      setTimeout(() => {
        analyzeConversation(conversationHistory, message);
      }, 1000);
    }
  };

  if (!selectedConversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">AI-Enhanced Smart Inbox</h3>
          <p className="text-gray-500">Select a conversation to view AI insights and assistance</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex relative">
      {/* Main Chat View */}
      <div className={`flex-1 transition-all duration-300 ${showAIPanel ? 'mr-2' : ''}`}>
        <EnhancedChatView
          selectedConversation={selectedConversation}
          messages={messages}
          onSendMessage={handleSendMessage}
          showTemplates={showTemplates}
          onToggleTemplates={onToggleTemplates}
          user={user}
          isLoading={isLoading}
          onThreadView={onThreadView}
        />
      </div>

      {/* AI Panel Toggle Button */}
      <div className="absolute top-4 right-2 z-10">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAIPanel(!showAIPanel)}
          className="bg-white shadow-md"
        >
          <Brain className="h-4 w-4 mr-1" />
          AI
          {showAIPanel ? <ChevronRight className="h-4 w-4 ml-1" /> : <ChevronLeft className="h-4 w-4 ml-1" />}
        </Button>
      </div>

      {/* AI Insights Panel */}
      {showAIPanel && (
        <div 
          className="flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto"
          style={{ width: aiPanelWidth }}
        >
          <div className="p-4 space-y-4">
            <AIInsightsPanel
              leadId={selectedConversation.leadId}
              conversation={selectedConversation}
              messages={messages}
            />
            
            <ContextualAssistancePanel
              leadId={selectedConversation.leadId}
              conversation={selectedConversation}
              onSendMessage={handleSendMessage}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedChatViewWithAI;
