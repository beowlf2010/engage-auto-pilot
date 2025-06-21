
import React from 'react';
import { useInboxOperations } from '@/hooks/inbox/useInboxOperations';
import { useConversationInitialization } from '@/hooks/inbox/useConversationInitialization';
import { useEnhancedConversationAI } from '@/hooks/useEnhancedConversationAI';
import InboxLayout from './InboxLayout';
import MessageDebugPanel from '../debug/MessageDebugPanel';
import { AIInsightsPanel } from './EnhancedMessageWrapper';
import { toast } from '@/hooks/use-toast';
import type { ConversationListItem, MessageData } from '@/hooks/conversation/conversationTypes';

interface SmartInboxMainProps {
  user: {
    role: string;
    id: string;
  };
  conversations: ConversationListItem[];
  messages: MessageData[];
  sendingMessage: boolean;
  loadMessages: (leadId: string) => Promise<void>;
  sendMessage: (leadId: string, message: string) => Promise<void>;
  setError: (error: string | null) => void;
  selectedLead: string | null;
  showMemory: boolean;
  showTemplates: boolean;
  isInitialized: boolean;
  setSelectedLead: (leadId: string | null) => void;
  setIsInitialized: (initialized: boolean) => void;
  handleToggleMemory: () => void;
  handleToggleTemplates: () => void;
  getLeadIdFromUrl: () => string | null;
  debugPanelOpen: boolean;
  setDebugPanelOpen: (open: boolean) => void;
}

const SmartInboxMain: React.FC<SmartInboxMainProps> = ({
  user,
  conversations,
  messages,
  sendingMessage,
  loadMessages,
  sendMessage,
  setError,
  selectedLead,
  showMemory,
  showTemplates,
  isInitialized,
  setSelectedLead,
  setIsInitialized,
  handleToggleMemory,
  handleToggleTemplates,
  getLeadIdFromUrl,
  debugPanelOpen,
  setDebugPanelOpen
}) => {
  const leadIdFromUrl = getLeadIdFromUrl();
  const selectedConversation = conversations.find(conv => conv.leadId === selectedLead);

  // Enhanced AI analysis for conversations
  const { analyzeConversation, lastAnalysis, loading: aiLoading } = useEnhancedConversationAI();

  // Get inbox operations
  const {
    canReply,
    handleSelectConversation,
    handleSendMessage
  } = useInboxOperations({
    user,
    loadMessages,
    sendMessage,
    sendingMessage,
    setError
  });

  // Enhanced conversation selection with AI analysis
  const handleEnhancedSelectConversation = React.useCallback(async (leadId: string) => {
    console.log('🤖 Enhanced conversation selection with AI analysis for lead:', leadId);
    
    // Set selected lead first
    setSelectedLead(leadId);
    
    // Load messages
    await handleSelectConversation(leadId);
    
    // Trigger AI analysis after messages are loaded
    if (messages.length > 0) {
      const conversationHistory = messages
        .map(msg => `${msg.direction === 'in' ? 'Customer' : 'Sales'}: ${msg.body}`)
        .join('\n');
      
      const latestCustomerMessage = messages
        .filter(msg => msg.direction === 'in')
        .slice(-1)[0];

      if (latestCustomerMessage && selectedConversation) {
        console.log('🔍 Analyzing conversation for AI insights...');
        
        try {
          await analyzeConversation(
            leadId,
            conversationHistory,
            latestCustomerMessage.body,
            selectedConversation.leadName || 'Customer',
            selectedConversation.vehicleInterest || ''
          );
        } catch (error) {
          console.error('❌ Error in AI conversation analysis:', error);
        }
      }
    }
  }, [setSelectedLead, handleSelectConversation, messages, selectedConversation, analyzeConversation]);

  // Handle conversation initialization
  useConversationInitialization({
    loading: false,
    isInitialized,
    filteredConversations: conversations,
    selectedLead,
    leadIdFromUrl,
    onSelectConversation: handleEnhancedSelectConversation,
    setIsInitialized
  });

  // Enhanced message sending with AI insights
  const onSendMessage = async (message: string, isTemplate?: boolean) => {
    try {
      await handleSendMessage(selectedLead, selectedConversation, message, isTemplate);
      
      if (isTemplate) {
        handleToggleTemplates();
      }

      // Trigger AI analysis after sending message
      if (selectedLead && selectedConversation) {
        console.log('🤖 Re-analyzing conversation after message sent...');
        
        // Small delay to ensure message is saved
        setTimeout(async () => {
          try {
            const updatedMessages = messages.concat([{
              id: `temp_${Date.now()}`,
              body: message,
              direction: 'out' as const,
              sentAt: new Date().toISOString(),
              leadId: selectedLead,
              aiGenerated: false
            }]);

            const conversationHistory = updatedMessages
              .map(msg => `${msg.direction === 'in' ? 'Customer' : 'Sales'}: ${msg.body}`)
              .join('\n');

            const latestCustomerMessage = updatedMessages
              .filter(msg => msg.direction === 'in')
              .slice(-1)[0];

            if (latestCustomerMessage) {
              await analyzeConversation(
                selectedLead,
                conversationHistory,
                latestCustomerMessage.body,
                selectedConversation.leadName || 'Customer',
                selectedConversation.vehicleInterest || ''
              );
            }
          } catch (error) {
            console.error('❌ Error in post-send AI analysis:', error);
          }
        }, 1000);
      }
      
    } catch (error) {
      console.error('❌ [SMART INBOX] Send message error:', error);
      
      // Use global debug function if available
      if ((window as any).debugLog) {
        (window as any).debugLog('error', 'Smart Inbox', 'Send Message Handler Failed', { 
          selectedLead,
          conversationLeadId: selectedConversation?.leadId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      toast({
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
    }
  };

  // Auto-analyze when messages change for selected conversation
  React.useEffect(() => {
    if (selectedLead && messages.length > 0 && selectedConversation) {
      const latestCustomerMessage = messages
        .filter(msg => msg.direction === 'in')
        .slice(-1)[0];

      if (latestCustomerMessage) {
        console.log('🔄 Auto-analyzing conversation due to message changes...');
        
        const conversationHistory = messages
          .map(msg => `${msg.direction === 'in' ? 'Customer' : 'Sales'}: ${msg.body}`)
          .join('\n');

        analyzeConversation(
          selectedLead,
          conversationHistory,
          latestCustomerMessage.body,
          selectedConversation.leadName || 'Customer',
          selectedConversation.vehicleInterest || ''
        ).catch(error => {
          console.error('❌ Error in auto-analysis:', error);
        });
      }
    }
  }, [selectedLead, messages, selectedConversation, analyzeConversation]);

  return (
    <>
      {/* AI Insights Panel - Show when analysis is available */}
      {lastAnalysis && selectedLead && (
        <div className="mb-4">
          <AIInsightsPanel 
            analysis={lastAnalysis.analysis} 
            className="border-l-4 border-l-purple-500" 
          />
          {aiLoading && (
            <div className="mt-2 text-sm text-purple-600 flex items-center">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600 mr-2"></div>
              Analyzing conversation...
            </div>
          )}
        </div>
      )}

      <InboxLayout
        conversations={conversations}
        messages={messages}
        selectedLead={selectedLead}
        selectedConversation={selectedConversation}
        showMemory={showMemory}
        showTemplates={showTemplates}
        sendingMessage={sendingMessage}
        user={user}
        onSelectConversation={handleEnhancedSelectConversation}
        onSendMessage={onSendMessage}
        onToggleTemplates={handleToggleTemplates}
        canReply={canReply}
      />
      <MessageDebugPanel
        isOpen={debugPanelOpen}
        onToggle={() => setDebugPanelOpen(!debugPanelOpen)}
        leadId={selectedLead || undefined}
      />
    </>
  );
};

export default SmartInboxMain;
