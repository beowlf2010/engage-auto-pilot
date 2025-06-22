
import React, { useState, useEffect } from 'react';
import { useStableConversationOperations } from '@/hooks/useStableConversationOperations';
import { useUnifiedAIScheduler } from '@/hooks/useUnifiedAIScheduler';
import { useLeads } from '@/hooks/useLeads';
import { realtimeLearningService } from '@/services/realtimeLearningService';
import { aiEmergencyService } from '@/services/aiEmergencyService';
import SmartInboxMain from './SmartInboxMain';
import AILearningDashboard from '@/components/ai/AILearningDashboard';
import AILearningMessageWrapper from './AILearningMessageWrapper';
import AIEmergencyToggle from '@/components/ai/AIEmergencyToggle';
import InboxStateManager from './InboxStateManager';
import InboxStatusDisplay from './InboxStatusDisplay';
import MessageDebugPanel from '../debug/MessageDebugPanel';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, BarChart3, AlertTriangle } from 'lucide-react';

interface SmartInboxWithAILearningProps {
  user: {
    role: string;
    id: string;
  };
}

const SmartInboxWithAILearning: React.FC<SmartInboxWithAILearningProps> = ({ user }) => {
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);
  const [showLearningDashboard, setShowLearningDashboard] = useState(false);
  const [showAIMessageWrapper, setShowAIMessageWrapper] = useState(false);
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [aiDisabled, setAiDisabled] = useState(false);
  const [aiDisableInfo, setAiDisableInfo] = useState<any>(null);

  useUnifiedAIScheduler();
  const { forceRefresh: refreshLeads } = useLeads();

  const { 
    conversations, 
    messages, 
    loading, 
    error,
    sendingMessage,
    loadMessages, 
    sendMessage: originalSendMessage, 
    manualRefresh,
    setError,
    markAsRead,
    markingAsRead
  } = useStableConversationOperations({
    onLeadsRefresh: refreshLeads
  });

  // Initialize AI emergency service
  useEffect(() => {
    const initializeEmergencyService = async () => {
      await aiEmergencyService.initialize();
      setAiDisabled(aiEmergencyService.isAIDisabled());
      setAiDisableInfo(aiEmergencyService.getDisableInfo());

      const unsubscribe = aiEmergencyService.onStatusChange((disabled) => {
        setAiDisabled(disabled);
        setAiDisableInfo(aiEmergencyService.getDisableInfo());
      });

      return unsubscribe;
    };

    let unsubscribe: (() => void) | undefined;
    initializeEmergencyService().then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Enhanced send message with AI safety checks
  const sendMessage = async (leadId: string, messageContent: string) => {
    // AI Safety Check
    const canProceed = await aiEmergencyService.checkBeforeAIAction('send_message');
    if (!canProceed) {
      throw new Error('AI messaging is currently disabled for safety reasons');
    }

    try {
      console.log('🧠 Enhanced AI Learning: Sending message with learning integration');
      
      await originalSendMessage(leadId, messageContent);
      
      await realtimeLearningService.processLearningEvent({
        type: 'message_sent',
        leadId,
        data: {
          content: messageContent,
          messageLength: messageContent.length,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date()
      });

      console.log('✅ Enhanced AI Learning: Message sent and learning event processed');
      
    } catch (error) {
      console.error('❌ Enhanced AI Learning: Error in send message:', error);
      throw error;
    }
  };

  const enhancedLoadMessages = async (leadId: string) => {
    setSelectedLead(leadId);
    await loadMessages(leadId);
    
    setTimeout(async () => {
      const conversationHistory = messages
        .map(m => `${m.direction === 'in' ? 'Customer' : 'Agent'}: ${m.body}`)
        .join('\n');
      
      if (conversationHistory) {
        await realtimeLearningService.processLearningEvent({
          type: 'conversation_analyzed',
          leadId,
          data: {
            messageCount: messages.length,
            conversationLength: conversationHistory.length,
            lastMessageDirection: messages[messages.length - 1]?.direction
          },
          timestamp: new Date()
        });
      }
    }, 1000);
  };

  // Fixed complete useEffect for response time tracking
  useEffect(() => {
    if (messages.length > 0 && selectedLead) {
      const incomingMessages = messages.filter(m => m.direction === 'in');
      const lastIncoming = incomingMessages[incomingMessages.length - 1];
      
      if (lastIncoming) {
        const outgoingMessages = messages.filter(m => m.direction === 'out' && new Date(m.sentAt) < new Date(lastIncoming.sentAt));
        const lastOutgoing = outgoingMessages[outgoingMessages.length - 1];
        
        if (lastOutgoing) {
          const responseTimeHours = (new Date(lastIncoming.sentAt).getTime() - new Date(lastOutgoing.sentAt).getTime()) / (1000 * 60 * 60);
          
          realtimeLearningService.processLearningEvent({
            type: 'response_received',
            leadId: selectedLead,
            data: {
              responseTimeHours,
              messageLength: lastIncoming.body.length
            },
            timestamp: new Date(lastIncoming.sentAt)
          });
        }
      }
    }
  }, [messages, selectedLead]);

  const filteredConversations = conversations.filter(conv => 
    user.role === "manager" || user.role === "admin" || conv.salespersonId === user.id || !conv.salespersonId
  );

  console.log('🧠 [SMART INBOX AI LEARNING] Render state:', {
    loading,
    conversationsCount: filteredConversations.length,
    hasError: !!error,
    showLearningDashboard,
    selectedLead,
    aiDisabled
  });

  const shouldShowStatus = error || (loading && filteredConversations.length === 0);

  if (shouldShowStatus) {
    return (
      <>
        <InboxStatusDisplay
          loading={loading}
          error={error}
          conversationsCount={filteredConversations.length}
          onRetry={manualRefresh}
        />
        <MessageDebugPanel
          isOpen={debugPanelOpen}
          onToggle={() => setDebugPanelOpen(!debugPanelOpen)}
        />
      </>
    );
  }

  return (
    <div className="flex h-screen">
      <div className={`flex-1 ${showLearningDashboard ? 'mr-2' : ''}`}>
        <InboxStateManager>
          {(stateProps) => (
            <div className="h-full flex flex-col">
              {/* AI Emergency Warning Banner */}
              {aiDisabled && (
                <Alert className="border-red-500 bg-red-50 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <strong>AI EMERGENCY SHUTDOWN ACTIVE:</strong> {aiDisableInfo?.reason || 'AI messaging disabled'}
                    {aiDisableInfo?.disabledAt && (
                      <div className="text-sm mt-1">
                        Disabled at: {new Date(aiDisableInfo.disabledAt).toLocaleString()}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Enhanced Header with Emergency Controls */}
              <div className="border-b bg-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-6 h-6 text-blue-600" />
                  <h1 className="text-xl font-semibold">Smart Inbox with AI Learning</h1>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Emergency AI Toggle - Always Visible */}
                  <AIEmergencyToggle 
                    userId={user.id} 
                    size="sm"
                    showStatus={false}
                  />
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAIMessageWrapper(!showAIMessageWrapper)}
                    className={showAIMessageWrapper ? 'bg-blue-50 border-blue-300' : ''}
                    disabled={aiDisabled}
                  >
                    <Brain className="w-4 h-4 mr-1" />
                    AI Assistant
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowLearningDashboard(!showLearningDashboard)}
                    className={showLearningDashboard ? 'bg-blue-50 border-blue-300' : ''}
                  >
                    <BarChart3 className="w-4 h-4 mr-1" />
                    Learning Dashboard
                  </Button>
                </div>
              </div>

              {/* AI Message Wrapper */}
              {showAIMessageWrapper && selectedLead && !aiDisabled && (
                <div className="border-b bg-blue-50 p-4">
                  <AILearningMessageWrapper
                    leadId={selectedLead}
                    leadName={stateProps.selectedConversation?.leadName || 'Unknown Lead'}
                    messageContent="Hi! I wanted to follow up on your interest in our vehicles. Do you have any questions I can help answer?"
                    onSendMessage={(message) => sendMessage(selectedLead, message)}
                    showLearningInsights={true}
                  />
                </div>
              )}

              {/* Main Inbox Content */}
              <div className="flex-1">
                <SmartInboxMain
                  user={user}
                  conversations={filteredConversations}
                  messages={messages}
                  sendingMessage={sendingMessage}
                  loading={loading}
                  loadMessages={enhancedLoadMessages}
                  sendMessage={sendMessage}
                  setError={setError}
                  debugPanelOpen={debugPanelOpen}
                  setDebugPanelOpen={setDebugPanelOpen}
                  markAsRead={markAsRead}
                  markingAsRead={markingAsRead}
                  getLeadIdFromUrl={() => {
                    const searchParams = new URLSearchParams(window.location.search);
                    return searchParams.get('leadId');
                  }}
                  {...stateProps}
                />
              </div>
            </div>
          )}
        </InboxStateManager>
      </div>

      {/* Learning Dashboard Sidebar */}
      {showLearningDashboard && (
        <div className="w-96 border-l bg-white overflow-y-auto">
          <div className="p-4">
            <AILearningDashboard
              leadId={selectedLead || undefined}
              compact={false}
            />
          </div>
        </div>
      )}

      <MessageDebugPanel
        isOpen={debugPanelOpen}
        onToggle={() => setDebugPanelOpen(!debugPanelOpen)}
      />
    </div>
  );
};

export default SmartInboxWithAILearning;
