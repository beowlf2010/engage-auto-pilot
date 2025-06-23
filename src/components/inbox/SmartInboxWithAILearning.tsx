
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useStableConversationOperations } from '@/hooks/useStableConversationOperations';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, Users, Clock, Zap, Brain, Sparkles, Settings, TrendingUp, Activity } from 'lucide-react';
import EnhancedConversationListItem from './EnhancedConversationListItem';
import EnhancedMessageBubble from './EnhancedMessageBubble';
import InventoryAwareMessageInput from './InventoryAwareMessageInput';
import ConnectionStatusIndicator from './ConnectionStatusIndicator';
import IntelligentAIPanel from './IntelligentAIPanel';
import ChatAIPanelsContainer from './ChatAIPanelsContainer';
import AIMessageWithLearning from './AIMessageWithLearning';
import PredictiveInsightsPanel from './PredictiveInsightsPanel';
import { ConversationListItem, MessageData } from '@/types/conversation';
import { toast } from '@/hooks/use-toast';
import { useRealtimeLearning } from '@/hooks/useRealtimeLearning';
import { usePredictiveAnalytics } from '@/hooks/usePredictiveAnalytics';

interface SmartInboxWithAILearningProps {
  user?: {
    role: string;
    id: string;
  };
  onLeadsRefresh?: () => void;
  conversations?: any[];
  messages?: any[];
  sendingMessage?: boolean;
  loading?: boolean;
  loadMessages?: (leadId: string) => Promise<void>;
  sendMessage?: (leadId: string, message: string) => Promise<void>;
  setError?: (error: string | null) => void;
  debugPanelOpen?: boolean;
  setDebugPanelOpen?: (open: boolean) => void;
  markAsRead?: (leadId: string) => Promise<void>;
  markingAsRead?: string | null;
  getLeadIdFromUrl?: () => string | null;
  [key: string]: any;
}

const SmartInboxWithAILearning: React.FC<SmartInboxWithAILearningProps> = ({ 
  user, 
  onLeadsRefresh,
  ...otherProps 
}) => {
  const { profile } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<ConversationListItem | null>(null);
  const [messageText, setMessageText] = useState('');
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showLearningDashboard, setShowLearningDashboard] = useState(false);
  const [showPredictiveInsights, setShowPredictiveInsights] = useState(false);
  const [aiEmergencyMode, setAiEmergencyMode] = useState(false);

  // Use stable conversation operations for reliable data management
  const {
    conversations,
    messages,
    loading,
    error,
    sendingMessage,
    loadMessages,
    sendMessage,
    manualRefresh,
    markAsRead,
    markingAsRead
  } = useStableConversationOperations({ onLeadsRefresh });

  // AI Learning capabilities
  const { learningInsights, isLearning, trackMessageOutcome } = useRealtimeLearning(
    selectedConversation?.leadId || ''
  );

  // Predictive analytics
  const { predictions, insights, isLoading: predictiveLoading } = usePredictiveAnalytics();

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.leadId);
    }
  }, [selectedConversation, loadMessages]);

  const handleSendMessage = useCallback(async (messageContent: string) => {
    if (!selectedConversation || !messageContent.trim()) return;

    try {
      await sendMessage(selectedConversation.leadId, messageContent.trim());
      setMessageText('');
      
      // Track learning outcome
      if (selectedConversation.leadId) {
        await trackMessageOutcome(messageContent, 'sent');
      }
      
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully",
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive"
      });
    }
  }, [selectedConversation, sendMessage, trackMessageOutcome]);

  const handleConversationSelect = useCallback((conversation: ConversationListItem) => {
    setSelectedConversation(conversation);
  }, []);

  const canReply = useMemo(() => {
    return selectedConversation && 
           (selectedConversation.salespersonId === profile?.id || 
            selectedConversation.salespersonId === null);
  }, [selectedConversation, profile?.id]);

  const conversationMessages = useMemo(() => {
    return messages.map(msg => ({
      ...msg,
      leadName: selectedConversation?.leadName || '',
      vehicleInterest: selectedConversation?.vehicleInterest || ''
    }));
  }, [messages, selectedConversation]);

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-gray-50">
      {/* Left Sidebar - Conversations List */}
      <div className="w-1/3 border-r bg-white flex flex-col">
        {/* Enhanced Header with AI Learning Controls */}
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Smart Inbox</h2>
              <Badge variant="outline" className="bg-purple-100 text-purple-700">
                <Brain className="h-3 w-3 mr-1" />
                AI Learning
              </Badge>
              {isLearning && (
                <Badge variant="outline" className="bg-green-100 text-green-700">
                  <Activity className="h-3 w-3 mr-1 animate-pulse" />
                  Learning
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <ConnectionStatusIndicator 
                connectionState="connected" 
                onReconnect={manualRefresh}
              />
              <Button
                variant={aiEmergencyMode ? "destructive" : "outline"}
                size="sm"
                onClick={() => setAiEmergencyMode(!aiEmergencyMode)}
                className="text-xs"
              >
                {aiEmergencyMode ? "Emergency ON" : "AI Control"}
              </Button>
            </div>
          </div>

          {/* AI Learning Dashboard Toggle */}
          <div className="flex items-center gap-2 mb-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLearningDashboard(!showLearningDashboard)}
              className="text-xs"
            >
              <Brain className="h-3 w-3 mr-1" />
              {showLearningDashboard ? 'Hide' : 'Show'} Learning Dashboard
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPredictiveInsights(!showPredictiveInsights)}
              className="text-xs"
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              Predictive Insights
            </Button>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{conversations.length} conversations</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Real-time updates</span>
            </div>
            {learningInsights && (
              <div className="flex items-center gap-1">
                <Sparkles className="h-4 w-4" />
                <span>{learningInsights.length} insights</span>
              </div>
            )}
          </div>
        </div>

        {/* AI Learning Dashboard */}
        {showLearningDashboard && (
          <div className="border-b bg-blue-50 p-3">
            <div className="text-sm">
              <div className="font-medium mb-2">AI Learning Status</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-600">Active Learning:</span>
                  <span className={`ml-1 ${isLearning ? 'text-green-600' : 'text-gray-400'}`}>
                    {isLearning ? 'ON' : 'OFF'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Insights:</span>
                  <span className="ml-1 text-blue-600">{learningInsights?.length || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600">Emergency Mode:</span>
                  <span className={`ml-1 ${aiEmergencyMode ? 'text-red-600' : 'text-green-600'}`}>
                    {aiEmergencyMode ? 'ACTIVE' : 'Normal'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Predictions:</span>
                  <span className="ml-1 text-purple-600">{predictions?.length || 0}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No conversations found</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <EnhancedConversationListItem
                key={conversation.leadId}
                conversation={conversation}
                isSelected={selectedConversation?.leadId === conversation.leadId}
                onSelect={() => handleConversationSelect(conversation)}
                canReply={canReply || false}
                markAsRead={markAsRead}
                isMarkingAsRead={markingAsRead === conversation.leadId}
              />
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{selectedConversation.leadName}</h3>
                  <p className="text-sm text-gray-600">{selectedConversation.vehicleInterest}</p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedConversation.unreadCount > 0 && (
                    <Badge variant="destructive">
                      {selectedConversation.unreadCount} unread
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {selectedConversation.status}
                  </Badge>
                  {isLearning && (
                    <Badge variant="outline" className="bg-green-100 text-green-700">
                      <Brain className="h-3 w-3 mr-1" />
                      AI Learning Active
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {conversationMessages.map((message) => (
                <EnhancedMessageBubble
                  key={message.id}
                  message={message}
                  onRetry={message.smsStatus === 'failed' ? () => {
                    console.log('Retrying message:', message.id);
                  } : undefined}
                />
              ))}
            </div>

            {/* Message Input */}
            {canReply && (
              <div className="p-4 border-t bg-white">
                <InventoryAwareMessageInput
                  leadId={selectedConversation.leadId}
                  conversationHistory={conversationMessages.map(m => `${m.direction === 'in' ? 'Customer' : 'Sales'}: ${m.body}`).join('\n')}
                  onSendMessage={handleSendMessage}
                  disabled={sendingMessage}
                  placeholder="Type your message..."
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
              <p>Choose a conversation from the left to start messaging with AI learning</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - AI Panels */}
      {selectedConversation && (
        <div className="w-80 border-l bg-white flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold">AI Assistant & Learning</h3>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* AI Message with Learning */}
            <AIMessageWithLearning
              leadId={selectedConversation.leadId}
              leadName={selectedConversation.leadName}
              messageContent="AI-generated message based on learning insights"
              onSendMessage={handleSendMessage}
              showInsights={true}
            />

            <Separator />

            {/* Intelligent AI Panel - Main Feature */}
            <IntelligentAIPanel
              conversation={selectedConversation}
              messages={conversationMessages}
              onSendMessage={handleSendMessage}
              canReply={canReply || false}
              isCollapsed={!showAIPanel}
              onToggleCollapse={() => setShowAIPanel(!showAIPanel)}
            />

            <Separator />

            {/* Additional AI Panels */}
            <ChatAIPanelsContainer
              showAnalysis={showAnalysis}
              showAIPanel={false}
              showAIGenerator={showAIGenerator}
              canReply={canReply || false}
              selectedConversation={selectedConversation}
              messages={conversationMessages}
              onSummaryUpdate={() => {}}
              onSelectSuggestion={handleSendMessage}
              onToggleAIPanel={() => setShowAIPanel(!showAIPanel)}
              onSendAIMessage={handleSendMessage}
              onCloseAIGenerator={() => setShowAIGenerator(false)}
            />

            {/* AI Panel Controls */}
            <Card>
              <CardContent className="p-3">
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAnalysis(!showAnalysis)}
                    className="justify-start"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    {showAnalysis ? 'Hide' : 'Show'} Analysis
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAIGenerator(!showAIGenerator)}
                    className="justify-start"
                    disabled={!canReply}
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    AI Message Generator
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAiEmergencyMode(!aiEmergencyMode)}
                    className={`justify-start ${aiEmergencyMode ? 'bg-red-50 text-red-700' : ''}`}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {aiEmergencyMode ? 'Disable Emergency' : 'Emergency Mode'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Predictive Insights Panel */}
      <PredictiveInsightsPanel
        isOpen={showPredictiveInsights}
        onToggle={() => setShowPredictiveInsights(!showPredictiveInsights)}
        predictions={predictions || []}
        insights={insights}
      />
    </div>
  );
};

export default SmartInboxWithAILearning;
