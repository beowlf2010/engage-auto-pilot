
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Loader2, Send, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { generateEnhancedIntelligentResponse, shouldGenerateResponse, type ConversationContext } from '@/services/intelligentConversationAI';
import { toast } from '@/hooks/use-toast';

interface IntelligentAIPanelProps {
  conversation: any;
  messages: any[];
  onSendMessage: (message: string) => Promise<void>;
  canReply: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const IntelligentAIPanel = ({ 
  conversation, 
  messages, 
  onSendMessage, 
  canReply,
  isCollapsed = false,
  onToggleCollapse
}: IntelligentAIPanelProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastAIResponse, setLastAIResponse] = useState<string | null>(null);

  if (!conversation || !canReply) return null;

  const context: ConversationContext = {
    leadId: conversation.leadId,
    leadName: conversation.leadName,
    vehicleInterest: conversation.vehicleInterest,
    messages: messages,
    leadInfo: {
      phone: conversation.leadPhone,
      status: conversation.status,
      lastReplyAt: conversation.lastReplyAt
    }
  };

  const shouldGenerate = shouldGenerateResponse(context);
  const lastCustomerMessage = messages
    .filter(msg => msg.direction === 'in')
    .slice(-1)[0];

  const handleGenerateResponse = async () => {
    setIsGenerating(true);
    
    try {
      console.log('🤖 Generating QUESTION-FIRST intelligent AI response...');
      const response = await generateEnhancedIntelligentResponse(context);
      
      if (response) {
        setLastAIResponse(response.message);
        toast({
          title: "AI Response Generated",
          description: "Finn has analyzed the conversation and generated a QUESTION-FIRST response",
        });
      } else {
        toast({
          title: "No Response Needed",
          description: "Finn determined no response is needed at this time",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('❌ Error generating QUESTION-FIRST AI response:', error);
      toast({
        title: "Error",
        description: "Failed to generate AI response",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendAIResponse = async () => {
    if (lastAIResponse) {
      try {
        await onSendMessage(lastAIResponse);
        setLastAIResponse(null);
        toast({
          title: "AI Response Sent",
          description: "Finn's QUESTION-FIRST response has been sent to the customer",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to send AI response",
          variant: "destructive"
        });
      }
    }
  };

  // If collapsed, show compact header only
  if (isCollapsed) {
    return (
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Finn AI Assistant</span>
              {shouldGenerate && (
                <Badge variant="outline" className="bg-orange-100 text-orange-700 text-xs">
                  Ready to help
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="h-6 w-6 p-0"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-purple-200 bg-purple-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Brain className="h-4 w-4 text-purple-600" />
            Finn AI Assistant
            <Badge variant="outline" className="bg-purple-100 text-purple-700">
              Question-First
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="h-6 w-6 p-0"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {lastCustomerMessage && shouldGenerate && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">Customer asked:</p>
                <p className="text-sm text-blue-700 mt-1 italic">
                  "{lastCustomerMessage.body}"
                </p>
              </div>
            </div>
          </div>
        )}

        {lastAIResponse && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Brain className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">Finn suggests:</p>
                <p className="text-sm text-green-700 mt-1">
                  "{lastAIResponse}"
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleGenerateResponse}
            disabled={isGenerating || !shouldGenerate}
            size="sm"
            variant="outline"
            className="flex-1"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Brain className="h-4 w-4 mr-2" />
            )}
            {isGenerating ? 'Thinking...' : 'Generate Response'}
          </Button>

          {lastAIResponse && (
            <Button
              onClick={handleSendAIResponse}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          )}
        </div>

        {!shouldGenerate && !lastAIResponse && (
          <p className="text-xs text-slate-500 text-center">
            Finn is monitoring for questions to answer...
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default IntelligentAIPanel;
