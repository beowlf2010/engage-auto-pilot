
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Loader2, Send, Sparkles, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
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
  const [lastAIResponse, setLastAIResponse] = useState<string | null>(null);
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
    
    try {
      console.log('🤖 Generating QUESTION-FIRST intelligent AI response...');
      
      const messageContext: MessageContext = {
        leadId: conversation.leadId,
        leadName: conversation.leadName || 'there',
        latestMessage: lastCustomerMessage?.body || '',
        conversationHistory: messages.map(m => m.body),
        vehicleInterest: conversation.vehicleInterest || ''
      };

      const response = unifiedAIResponseEngine.generateResponse(messageContext);
      
      if (response && response.message) {
        setLastAIResponse(response.message);
        toast({
          title: "AI Response Generated",
          description: "Finn has analyzed the conversation and generated a QUESTION-FIRST response",
        });
      } else {
        setError("Finn determined no response is needed at this time");
        toast({
          title: "No Response Needed",
          description: "Finn determined no response is needed at this time",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('❌ Error generating QUESTION-FIRST AI response:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate AI response';
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: "Failed to generate AI response. This may be due to database connectivity issues.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendAIResponse = async () => {
    if (!lastAIResponse) return;
    
    try {
      await onSendMessage(lastAIResponse);
      setLastAIResponse(null);
      setError(null);
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
              {shouldGenerate() && (
                <Badge variant="outline" className="bg-orange-100 text-orange-700 text-xs">
                  Ready to help
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
            <Brain className="h-4 w-4 text-purple-600" />
            Finn AI Assistant
            <Badge variant="outline" className="bg-purple-100 text-purple-700">
              Question-First
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

        {/* Customer Question Display */}
        {lastCustomerMessage && shouldGenerate() && !error && (
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

        {/* AI Response Display */}
        {lastAIResponse && !error && (
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

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!lastAIResponse && !error && (
            <Button
              size="sm"
              onClick={handleGenerateResponse}
              disabled={isGenerating || !shouldGenerate()}
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

          {lastAIResponse && (
            <>
              <Button
                size="sm"
                onClick={handleSendAIResponse}
                className="flex-1"
              >
                <Send className="h-3 w-3 mr-2" />
                Send Response
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLastAIResponse(null)}
              >
                Clear
              </Button>
            </>
          )}
        </div>

        {!shouldGenerate() && !lastAIResponse && !error && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">No customer message to respond to</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default IntelligentAIPanel;
