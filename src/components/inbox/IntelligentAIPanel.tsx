
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Loader2, Send, Sparkles, ChevronDown, ChevronUp, AlertTriangle, Zap } from 'lucide-react';
import { unifiedAIResponseEngine, MessageContext } from '@/services/unifiedAIResponseEngine';
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
  const [aiResponse, setAiResponse] = useState<{
    message: string;
    intent: string;
    confidence: number;
    strategy: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!conversation || !canReply) return null;

  const shouldGenerate = () => {
    const lastCustomerMessage = messages.filter(msg => msg.direction === 'in').slice(-1)[0];
    if (!lastCustomerMessage) return false;
    
    const responseAfter = messages.find(msg => 
      msg.direction === 'out' && 
      new Date(msg.sent_at) > new Date(lastCustomerMessage.sent_at)
    );
    
    return !responseAfter;
  };

  const lastCustomerMessage = messages
    .filter(msg => msg.direction === 'in')
    .slice(-1)[0];

  const handleGenerateResponse = async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    setError(null);
    setAiResponse(null);
    
    try {
      console.log('🤖 [INTELLIGENT AI PANEL] Generating AI response...');
      
      const messageContext: MessageContext = {
        leadId: conversation.leadId,
        leadName: conversation.leadName || 'there',
        latestMessage: lastCustomerMessage?.body || '',
        conversationHistory: messages.map(m => m.body),
        vehicleInterest: conversation.vehicleInterest || 'finding the right vehicle'
      };

      const response = await unifiedAIResponseEngine.generateResponse(messageContext);
      
      if (response && response.message) {
        setAiResponse({
          message: response.message,
          intent: response.intent.primary,
          confidence: response.confidence,
          strategy: response.responseStrategy
        });
        
        toast({
          title: "Finn AI Response Generated",
          description: `AI analyzed the conversation and generated a ${response.intent.primary} response with ${Math.round(response.confidence * 100)}% confidence`,
        });
      } else {
        setError("Finn couldn't generate a response for this conversation");
        toast({
          title: "No Response Generated",
          description: "Finn determined no response is needed at this time",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('❌ [INTELLIGENT AI PANEL] Error generating AI response:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate AI response';
      setError(errorMessage);
      
      toast({
        title: "AI Generation Error",
        description: "Failed to generate AI response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendAIResponse = async () => {
    if (!aiResponse) return;
    
    try {
      await onSendMessage(aiResponse.message);
      setAiResponse(null);
      setError(null);
      toast({
        title: "Finn AI Response Sent",
        description: "AI-generated response has been sent to the customer",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send AI response",
        variant: "destructive"
      });
    }
  };

  // Collapsed view
  if (isCollapsed) {
    return (
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Finn AI Assistant</span>
              <Badge variant="outline" className="bg-green-100 text-green-700 text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                AI-Powered
              </Badge>
              {shouldGenerate() && (
                <Badge variant="outline" className="bg-orange-100 text-orange-700 text-xs">
                  Ready
                </Badge>
              )}
              {error && (
                <Badge variant="outline" className="bg-red-100 text-red-700 text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Error
                </Badge>
              )}
            </div>
            {onToggleCollapse && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleCollapse}
                className="h-6 w-6 p-0"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            )}
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
            <Zap className="h-4 w-4 text-purple-600" />
            Finn AI Assistant
            <Badge variant="outline" className="bg-green-100 text-green-700">
              <Sparkles className="h-3 w-3 mr-1" />
              AI-Powered
            </Badge>
          </CardTitle>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="h-6 w-6 p-0"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Error:</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Customer Message Display */}
        {lastCustomerMessage && shouldGenerate() && !error && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">Customer Message:</p>
                <p className="text-sm text-blue-700 mt-1 italic">
                  "{lastCustomerMessage.body}"
                </p>
              </div>
            </div>
          </div>
        )}

        {/* AI Response Display */}
        {aiResponse && !error && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Brain className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-medium text-green-800">Finn's AI Response:</p>
                  <Badge variant="outline" className="bg-green-100 text-green-700 text-xs">
                    {aiResponse.intent} • {Math.round(aiResponse.confidence * 100)}%
                  </Badge>
                </div>
                <p className="text-sm text-green-700">
                  "{aiResponse.message}"
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Strategy: {aiResponse.strategy}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!aiResponse && !error && (
            <Button
              size="sm"
              onClick={handleGenerateResponse}
              disabled={isGenerating || !shouldGenerate()}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  Finn is thinking...
                </>
              ) : (
                <>
                  <Zap className="h-3 w-3 mr-2" />
                  Generate AI Response
                </>
              )}
            </Button>
          )}

          {aiResponse && (
            <>
              <Button
                size="sm"
                onClick={handleSendAIResponse}
                className="flex-1"
              >
                <Send className="h-3 w-3 mr-2" />
                Send AI Response
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAiResponse(null)}
              >
                Generate New
              </Button>
            </>
          )}

          {error && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setError(null);
                handleGenerateResponse();
              }}
              className="flex-1"
            >
              Try Again
            </Button>
          )}
        </div>

        {!shouldGenerate() && !aiResponse && !error && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">No customer message to respond to</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default IntelligentAIPanel;
