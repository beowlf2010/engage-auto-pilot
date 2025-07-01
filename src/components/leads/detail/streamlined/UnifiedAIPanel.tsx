
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Brain, Send, Sparkles, AlertTriangle } from 'lucide-react';
import { unifiedAIResponseEngine, MessageContext } from '@/services/unifiedAIResponseEngine';
import { toast } from '@/hooks/use-toast';

interface UnifiedAIPanelProps {
  leadId: string;
  leadName: string;
  messages: any[];
  vehicleInterest?: string;
  onSendMessage: (message: string) => Promise<void>;
}

const UnifiedAIPanel: React.FC<UnifiedAIPanelProps> = ({
  leadId,
  leadName,
  messages,
  vehicleInterest = '',
  onSendMessage
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);

  const lastCustomerMessage = messages
    .filter(msg => msg.direction === 'in')
    .slice(-1)[0];

  const shouldShowGenerator = lastCustomerMessage && !messages.some(msg => 
    msg.direction === 'out' && 
    new Date(msg.sent_at) > new Date(lastCustomerMessage.sent_at)
  );

  const handleGenerateResponse = async () => {
    if (!shouldShowGenerator || isGenerating) return;

    setIsGenerating(true);
    try {
      console.log('🤖 Generating AI response using unified engine');

      const messageContext: MessageContext = {
        leadId,
        leadName,
        latestMessage: lastCustomerMessage.body,
        conversationHistory: messages.map(m => m.body),
        vehicleInterest
      };

      const response = unifiedAIResponseEngine.generateResponse(messageContext);
      
      if (response?.message) {
        setGeneratedMessage(response.message);
        toast({
          title: "AI Response Generated",
          description: "Review and send when ready",
        });
      } else {
        toast({
          title: "No Response Generated",
          description: "AI determined no response is needed at this time",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
      toast({
        title: "Error",
        description: "Failed to generate AI response",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendResponse = async () => {
    if (!generatedMessage) return;
    
    try {
      await onSendMessage(generatedMessage);
      setGeneratedMessage(null);
      toast({
        title: "Message Sent",
        description: "AI response sent successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  if (!shouldShowGenerator && !generatedMessage) {
    return (
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-gray-500">No customer message to respond to</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-200 bg-purple-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Brain className="h-4 w-4 text-purple-600" />
          Unified AI Assistant
          <Badge variant="outline" className="bg-purple-100 text-purple-700">
            Smart Response
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Customer Message Context */}
        {lastCustomerMessage && (
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

        {/* Generated Response */}
        {generatedMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Brain className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">AI suggests:</p>
                <p className="text-sm text-green-700 mt-1">
                  "{generatedMessage}"
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!generatedMessage && (
            <Button
              size="sm"
              onClick={handleGenerateResponse}
              disabled={isGenerating}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Brain className="h-3 w-3 mr-2" />
                  Generate Response
                </>
              )}
            </Button>
          )}

          {generatedMessage && (
            <>
              <Button
                size="sm"
                onClick={handleSendResponse}
                className="flex-1"
              >
                <Send className="h-3 w-3 mr-2" />
                Send Response
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setGeneratedMessage(null)}
              >
                Clear
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UnifiedAIPanel;
