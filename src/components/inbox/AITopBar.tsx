import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles, Brain, MessageSquare, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import IntelligentAIPanel from './IntelligentAIPanel';
import ChatAnalysisPanel from './ChatAnalysisPanel';
import AIMessageGenerator from './AIMessageGenerator';
import AIInsightsPanel from '@/components/ai/AIInsightsPanel';

interface AITopBarProps {
  selectedConversation: any;
  messages: any[];
  onSendMessage: (message: string) => Promise<void>;
  canReply: boolean;
}

const AITopBar: React.FC<AITopBarProps> = ({
  selectedConversation,
  messages,
  onSendMessage,
  canReply
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("assistant");

  const getStatusText = () => {
    if (!selectedConversation) return "AI Ready";
    if (messages.length === 0) return "New Conversation";
    return canReply ? "AI Ready" : "Analyzing...";
  };

  const getStatusColor = () => {
    if (!selectedConversation) return "bg-muted";
    if (canReply) return "bg-emerald-500/20 text-emerald-700";
    return "bg-amber-500/20 text-amber-700";
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="relative z-30">
      {/* Glassy Top Bar */}
      <div className="sticky top-0 w-full bg-background/80 backdrop-blur-md border-b border-border/50 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left Side - AI Status */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              <div className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-primary rounded-full animate-ping" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">AI Assistant</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor()}`}>
                {getStatusText()}
              </span>
            </div>
          </div>

          {/* Center - Quick Stats */}
          {selectedConversation && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {messages.length} messages
              </Badge>
              {canReply && (
                <Badge variant="outline" className="text-xs text-emerald-600">
                  Can reply
                </Badge>
              )}
            </div>
          )}

          {/* Right Side - Expand Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleExpanded}
            className="h-8 w-8 p-0"
            disabled={!selectedConversation}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Gradient Border */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-purple-500/50 via-blue-500/50 to-emerald-500/50" />
      </div>

      {/* Expanded Panel */}
      {isExpanded && selectedConversation && (
        <div className="absolute top-full left-0 right-0 bg-background/95 backdrop-blur-md border-b border-border/50 shadow-lg z-40">
          <div className="p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="assistant" className="text-xs">
                  <Brain className="h-3 w-3 mr-1" />
                  Assistant
                </TabsTrigger>
                <TabsTrigger value="analysis" className="text-xs">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Analysis
                </TabsTrigger>
                <TabsTrigger value="generator" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Generator
                </TabsTrigger>
                <TabsTrigger value="insights" className="text-xs">
                  <Lightbulb className="h-3 w-3 mr-1" />
                  Insights
                </TabsTrigger>
              </TabsList>
              
              <div className="max-h-80 overflow-y-auto">
                <TabsContent value="assistant" className="mt-0">
                  <IntelligentAIPanel
                    conversation={selectedConversation}
                    messages={messages}
                    onSendMessage={onSendMessage}
                    canReply={canReply}
                    isCollapsed={false}
                    onToggleCollapse={() => {}}
                  />
                </TabsContent>
                
                <TabsContent value="analysis" className="mt-0">
                  <ChatAnalysisPanel
                    leadId={selectedConversation.leadId}
                    messageCount={messages.length}
                    canReply={canReply}
                    onSummaryUpdate={() => {}}
                    onSelectSuggestion={onSendMessage}
                  />
                </TabsContent>
                
                <TabsContent value="generator" className="mt-0">
                  {canReply ? (
                    <AIMessageGenerator
                      leadId={selectedConversation.leadId}
                      onSendMessage={onSendMessage}
                      onClose={() => setIsExpanded(false)}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-32">
                      <p className="text-muted-foreground text-sm">Cannot reply to this conversation</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="insights" className="mt-0">
                  <AIInsightsPanel
                    leadId={selectedConversation.leadId}
                    conversation={selectedConversation}
                    messages={messages}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  );
};

export default AITopBar;