import React from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import IntelligentAIPanel from './IntelligentAIPanel';
import ChatAnalysisPanel from './ChatAnalysisPanel';
import AIMessageGenerator from './AIMessageGenerator';
import AIInsightsPanel from '@/components/ai/AIInsightsPanel';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedConversation: any;
  messages: any[];
  onSendMessage: (message: string) => Promise<void>;
  canReply: boolean;
}

const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  selectedConversation,
  messages,
  onSendMessage,
  canReply
}) => {
  const [activeTab, setActiveTab] = React.useState("assistant");

  if (!selectedConversation) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🤖 AI Assistant
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Select a conversation to use AI features</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              🤖 AI Assistant - {selectedConversation.lead?.name || selectedConversation.lead?.phone || 'Unknown'}
            </span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="assistant">Assistant</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="generator">Generator</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>
          
          <div className="overflow-y-auto max-h-[70vh] mt-4">
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
              {canReply && (
                <AIMessageGenerator
                  leadId={selectedConversation.leadId}
                  onSendMessage={onSendMessage}
                  onClose={() => setActiveTab("assistant")}
                />
              )}
              {!canReply && (
                <div className="flex items-center justify-center h-32">
                  <p className="text-muted-foreground">Cannot reply to this conversation</p>
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
      </DialogContent>
    </Dialog>
  );
};

export default AIAssistantModal;