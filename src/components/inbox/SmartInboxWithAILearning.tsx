
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOptimizedInbox } from '@/hooks/useOptimizedInbox';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, Users, Clock, Zap, Brain, Sparkles } from 'lucide-react';
import EnhancedConversationListItem from './EnhancedConversationListItem';
import EnhancedMessageBubble from './EnhancedMessageBubble';
import InventoryAwareMessageInput from './InventoryAwareMessageInput';
import ConnectionStatusIndicator from './ConnectionStatusIndicator';
import LeadContextPanel from './LeadContextPanel';
import AIResponseIndicator from './AIResponseIndicator';
import AIResponsePreview from './AIResponsePreview';
import { ConversationListItem, MessageData } from '@/types/conversation';
import { toast } from '@/hooks/use-toast';
import { useAutoAIResponses } from '@/hooks/useAutoAIResponses';

interface SmartInboxWithAILearningProps {
  user: {
    id: string;
    role: string;
  };
  onLeadsRefresh?: () => void;
}

const SmartInboxWithAILearning: React.FC<SmartInboxWithAILearningProps> = ({ user, onLeadsRefresh }) => {
  const { profile } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<ConversationListItem | null>(null);
  const [messageText, setMessageText] = useState('');
  const [aiResponsePreviews, setAiResponsePreviews] = useState<Map<string, any>>(new Map());

  const {
    conversations,
    messages,
    loading,
    sendingMessage,
    loadMessages,
    sendMessage,
    manualRefresh,
    setError
  } = useOptimizedInbox({ onLeadsRefresh });

  // Single consolidated AI responses hook
  const { manualTrigger, isProcessing } = useAutoAIResponses({
    profileId: profile?.id || '',
    onResponseGenerated: (leadId: string, response: string, context: any) => {
      console.log('🤖 AI Response generated (deprecated auto-send)', { leadId, response });
    },
    onResponsePreview: (leadId: string, preview: any) => {
      console.log('🤖 AI Response preview ready:', { leadId, preview });
      setAiResponsePreviews(prev => {
        const updated = new Map(prev);
        updated.set(leadId, preview);
        return updated;
      });
      
      toast({
        title: "Finn has a response ready",
        description: `Review AI response for ${preview.leadName}`,
      });
    }
  });

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

  const handleManualAITrigger = useCallback(async () => {
    if (!selectedConversation) return;
    
    console.log('🤖 Manual AI trigger for lead:', selectedConversation.leadId);
    await manualTrigger(selectedConversation.leadId);
  }, [selectedConversation, manualTrigger]);

  const handleAIPreviewSent = useCallback((leadId: string) => {
    // Remove the preview after sending
    setAiResponsePreviews(prev => {
      const updated = new Map(prev);
      updated.delete(leadId);
      return updated;
    });
    
    // Refresh messages to show the sent message
    if (selectedConversation?.leadId === leadId) {
      loadMessages(leadId);
    }
  }, [selectedConversation, loadMessages]);

  const handleAIPreviewDismiss = useCallback((leadId: string) => {
    setAiResponsePreviews(prev => {
      const updated = new Map(prev);
      updated.delete(leadId);
      return updated;
    });
  }, []);

  const handleAIFeedback = useCallback((feedback: 'positive' | 'negative', notes?: string) => {
    console.log('🔄 AI Feedback received:', { feedback, notes });
    // This could be used to improve AI responses
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

  const hasUnreadInbound = useMemo(() => {
    if (!selectedConversation) return false;
    
    const lastMessage = conversationMessages[conversationMessages.length - 1];
    return lastMessage?.direction === 'in' && selectedConversation.unreadCount > 0;
  }, [selectedConversation, conversationMessages]);

  const currentPreview = selectedConversation ? aiResponsePreviews.get(selectedConversation.leadId) : null;

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-gray-50">
      {/* Left Sidebar - Conversations List */}
      <div className="w-1/3 border-r bg-white flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Smart Inbox</h2>
              <Badge variant="outline" className="bg-purple-100 text-purple-700">
                <Brain className="h-3 w-3 mr-1" />
                AI Enhanced
              </Badge>
            </div>
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
          </div>
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
            conversations.map((conversation) => {
              const hasPreview = aiResponsePreviews.has(conversation.leadId);
              
              return (
                <div key={conversation.leadId} className="relative">
                  <EnhancedConversationListItem
                    conversation={conversation}
                    isSelected={selectedConversation?.leadId === conversation.leadId}
                    onSelect={() => handleConversationSelect(conversation)}
                    canReply={canReply || false}
                    markAsRead={async () => {}}
                    isMarkingAsRead={false}
                  />
                  
                  {/* AI Response Indicator */}
                  {selectedConversation?.leadId === conversation.leadId && (
                    <div className="px-3 pb-2">
                      <AIResponseIndicator
                        isGenerating={isProcessing}
                        onManualTrigger={handleManualAITrigger}
                        canTrigger={hasUnreadInbound && !hasPreview}
                        hasPreview={hasPreview}
                        onViewPreview={() => {
                          // Preview is shown in main chat area when conversation is selected
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })
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
                </div>
              </div>
            </div>

            {/* AI Response Preview */}
            {currentPreview && (
              <div className="p-4 bg-blue-50 border-b">
                <AIResponsePreview
                  leadId={selectedConversation.leadId}
                  preview={currentPreview}
                  profileId={profile?.id || ''}
                  onSent={() => handleAIPreviewSent(selectedConversation.leadId)}
                  onDismiss={() => handleAIPreviewDismiss(selectedConversation.leadId)}
                  onFeedback={handleAIFeedback}
                />
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {conversationMessages.map((message) => (
                <EnhancedMessageBubble
                  key={message.id}
                  message={message}
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
              <p>Choose a conversation from the left to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - Lead Context Panel */}
      {selectedConversation && (
        <div className="w-80 border-l bg-white">
          <LeadContextPanel
            conversation={selectedConversation}
            onScheduleAppointment={() => {
              console.log('Schedule appointment for:', selectedConversation.leadName);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default SmartInboxWithAILearning;
