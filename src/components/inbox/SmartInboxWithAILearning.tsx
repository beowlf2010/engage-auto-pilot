
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useEnhancedRealtimeInbox } from '@/hooks/useEnhancedRealtimeInbox';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, Users, Clock, Zap, Brain, Sparkles, Activity, Shield, BarChart3 } from 'lucide-react';
import EnhancedConversationListItem from './EnhancedConversationListItem';
import EnhancedMessageBubble from './EnhancedMessageBubble';
import InventoryAwareMessageInput from './InventoryAwareMessageInput';
import ConnectionStatusIndicator from './ConnectionStatusIndicator';
import IntelligentAIPanel from './IntelligentAIPanel';
import ChatAIPanelsContainer from './ChatAIPanelsContainer';
import AIResponseSuggestionPanel from './AIResponseSuggestionPanel';
import CollapsibleAIPanels from './CollapsibleAIPanels';
import { ConversationListItem, MessageData } from '@/types/conversation';
import { toast } from '@/hooks/use-toast';

// AI Learning Dashboard imports
import AIEmergencyToggle from '@/components/ai/AIEmergencyToggle';

interface SmartInboxWithAILearningProps {
  onLeadsRefresh?: () => void;
  user?: {
    role: string;
    id: string;
  };
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
  onLeadsRefresh, 
  user,
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

  const {
    conversations,
    messages,
    loading,
    sendingMessage,
    loadMessages,
    sendMessage,
    connectionState,
    retryMessage,
    manualRefresh
  } = useEnhancedRealtimeInbox({ onLeadsRefresh });

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
  }, [selectedConversation, sendMessage]);

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

  // Mock functions to satisfy EnhancedConversationListItem props
  const mockMarkAsRead = async (leadId: string) => {
    console.log('Mark as read:', leadId);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-gray-50">
      {/* Left Sidebar - Conversations List - Fixed Width */}
      <div className="w-80 flex-shrink-0 border-r bg-white flex flex-col">
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
            </div>
            <div className="flex items-center gap-2">
              <AIEmergencyToggle />
              <ConnectionStatusIndicator 
                connectionState={connectionState} 
                onReconnect={() => manualRefresh()}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{conversations.length} conversations</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Real-time learning</span>
            </div>
          </div>
        </div>

        {/* Collapsible AI Panels */}
        <div className="px-4 py-2">
          <CollapsibleAIPanels
            showLearningDashboard={showLearningDashboard}
            showPredictiveInsights={showPredictiveInsights}
            onToggleLearningDashboard={() => setShowLearningDashboard(!showLearningDashboard)}
            onTogglePredictiveInsights={() => setShowPredictiveInsights(!showPredictiveInsights)}
            selectedConversation={selectedConversation}
          />
        </div>

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
                markAsRead={mockMarkAsRead}
                isMarkingAsRead={false}
              />
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area - Flexible Width */}
      <div className="flex-1 min-w-0 flex flex-col">
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
                  <Badge variant="outline" className="bg-green-100 text-green-700">
                    <Shield className="h-3 w-3 mr-1" />
                    AI Learning Active
                  </Badge>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {conversationMessages.map((message) => (
                <EnhancedMessageBubble
                  key={message.id}
                  message={message}
                  onRetry={message.smsStatus === 'failed' ? () => retryMessage(selectedConversation.leadId, message.id) : undefined}
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
                  placeholder="Type your message... (AI Learning will analyze your style)"
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Brain className="h-16 w-16 mx-auto mb-4 text-purple-300" />
              <h3 className="text-lg font-medium mb-2">AI Learning Smart Inbox</h3>
              <p>Select a conversation to start with AI-powered insights</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - Enhanced AI Panels - Fixed Width */}
      {selectedConversation && (
        <div className="w-96 flex-shrink-0 border-l bg-white flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold">AI Learning Assistant</h3>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* AI Response Suggestion Panel - Primary Feature */}
            <AIResponseSuggestionPanel
              selectedConversation={selectedConversation}
              messages={conversationMessages}
              onSendMessage={handleSendMessage}
              canReply={canReply || false}
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
              showAIPanel={false} // We're showing the intelligent panel above
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

            {/* Enhanced AI Panel Controls */}
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
                    {showAnalysis ? 'Hide' : 'Show'} AI Analysis
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAIGenerator(!showAIGenerator)}
                    className="justify-start"
                    disabled={!canReply}
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    AI Learning Generator
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartInboxWithAILearning;
