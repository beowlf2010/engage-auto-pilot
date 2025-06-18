
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Loader2, Send, Sparkles } from 'lucide-react';
import { generateIntelligentResponse, shouldGenerateResponse, type ConversationContext } from '@/services/intelligentConversationAI';
import { toast } from '@/hooks/use-toast';

interface IntelligentAIPanelProps {
  conversation: any;
  messages: any[];
  onSendMessage: (message: string) => Promise<void>;
  canReply: boolean;
}

const IntelligentAIPanel = ({ 
  conversation, 
  messages, 
  onSendMessage, 
  canReply 
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
      console.log('🤖 Generating intelligent AI response...');
      const response = await generateIntelligentResponse(context);
      
      if (response) {
        setLastAIResponse(response.message);
        toast({
          title: "AI Response Generated",
          description: "Finn has analyzed the conversation and generated a response",
        });
      } else {
        toast({
          title: "No Response Needed",
          description: "Finn determined no response is needed at this time",
          variant: "secondary"
        });
      }
    } catch (error) {
      console.error('❌ Error generating AI response:', error);
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
          description: "Finn's response has been sent to the customer",
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

  return (
    <Card className="border-purple-200 bg-purple-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Brain className="h-4 w-4 text-purple-600" />
          Finn AI Assistant
          <Badge variant="secondary" className="bg-purple-100 text-purple-700">
            Intelligent
          </Badge>
        </CardTitle>
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
            Finn is monitoring the conversation...
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default IntelligentAIPanel;
