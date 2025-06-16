
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Send, 
  Bot, 
  User, 
  Phone, 
  Car, 
  Clock, 
  MessageSquare,
  Star,
  MapPin,
  Mail,
  Calendar,
  Sparkles,
  BarChart3
} from 'lucide-react';
import MessageBubble from './MessageBubble';
import LeadContextPanel from './LeadContextPanel';
import AIMessageGenerator from './AIMessageGenerator';
import ConversationSummaryPanel from '../conversation/ConversationSummaryPanel';
import ResponseSuggestionsPanel from '../conversation/ResponseSuggestionsPanel';
import SentimentIndicator from '../conversation/SentimentIndicator';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
        console.log('Sending message from chat view:', newMessage.trim());
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

  const averageSentiment = getAverageSentiment();

  if (!selectedConversation) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center">
          <MessageSquare className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">Select a conversation</h3>
          <p className="text-slate-500">Choose a conversation from the list to start messaging</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4 h-full">
      {/* Main Chat Area */}
      <div className={`${showLeadContext ? 'col-span-8' : 'col-span-12'} flex flex-col space-y-4`}>
        {/* Analysis Panels */}
        {showAnalysis && (
          <div className="space-y-4">
            <ConversationSummaryPanel
              leadId={selectedConversation.leadId}
              messageCount={messages.length}
              onSummaryUpdate={updateSummary}
            />
            <ResponseSuggestionsPanel
              leadId={selectedConversation.leadId}
              onSelectSuggestion={handleSelectSuggestion}
              isVisible={canReply}
            />
          </div>
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
          {/* Chat Header */}
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {selectedConversation.leadName}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                    <Car className="h-3 w-3" />
                    <span>{selectedConversation.vehicleInterest}</span>
                    {selectedConversation.aiOptIn && (
                      <Badge variant="outline" className="ml-2 text-xs bg-purple-50 text-purple-700">
                        <Bot className="h-3 w-3 mr-1" />
                        AI Active
                      </Badge>
                    )}
                    {averageSentiment !== 0 && (
                      <SentimentIndicator
                        sentimentScore={averageSentiment}
                        sentimentLabel={
                          averageSentiment > 0.1 ? 'positive' : 
                          averageSentiment < -0.1 ? 'negative' : 'neutral'
                        }
                        showDetails={false}
                        size="sm"
                      />
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAnalysis(!showAnalysis)}
                  className={showAnalysis ? 'bg-blue-50 text-blue-700' : ''}
                >
                  <BarChart3 className="h-4 w-4 mr-1" />
                  Analysis
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLeadContext(!showLeadContext)}
                >
                  {showLeadContext ? 'Hide' : 'Show'} Details
                </Button>
                {selectedConversation.unreadCount > 0 && (
                  <Badge variant="destructive">
                    {selectedConversation.unreadCount} unread
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          {/* Messages Area */}
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              <>
                {messages.map((message) => {
                  const sentiment = getSentimentForMessage(message.id);
                  return (
                    <div key={message.id} className="space-y-2">
                      <MessageBubble message={message} />
                      {sentiment && message.direction === 'in' && (
                        <div className="flex justify-start">
                          <SentimentIndicator
                            sentimentScore={sentiment.sentimentScore}
                            sentimentLabel={sentiment.sentimentLabel}
                            confidenceScore={sentiment.confidenceScore}
                            emotions={sentiment.emotions}
                            size="sm"
                            showDetails={false}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </CardContent>

          {/* Message Input */}
          {canReply && (
            <>
              <Separator />
              <div className="p-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Textarea
                      placeholder="Type your message... (Shift+Enter for new line)"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="min-h-[60px] resize-none"
                      maxLength={160}
                      disabled={isSending}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs text-slate-500">
                        {newMessage.length}/160 characters
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAIGenerator(!showAIGenerator)}
                          className="border-purple-300 text-purple-700 hover:bg-purple-50"
                          disabled={isSending}
                        >
                          <Sparkles className="h-4 w-4 mr-1" />
                          AI Generate
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onToggleTemplates}
                          disabled={isSending}
                        >
                          Templates
                        </Button>
                        <Button
                          onClick={handleSend}
                          disabled={!newMessage.trim() || isSending}
                          size="sm"
                        >
                          <Send className="h-4 w-4 mr-1" />
                          {isSending ? 'Sending...' : 'Send'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {!canReply && (
            <div className="p-4 bg-slate-50 border-t">
              <p className="text-sm text-slate-600 text-center">
                You can only view this conversation. Contact your manager for lead assignment.
              </p>
            </div>
          )}
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
