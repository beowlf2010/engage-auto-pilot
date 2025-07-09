import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Send, RefreshCw } from 'lucide-react';
import { unifiedAIResponseEngine, MessageContext } from '@/services/unifiedAIResponseEngine';
import { toast } from '@/hooks/use-toast';

interface AIResponseSuggestionPanelProps {
  conversation: any;
  messages: any[];
  onSendMessage: (message: string) => Promise<void>;
  className?: string;
}

const AIResponseSuggestionPanel: React.FC<AIResponseSuggestionPanelProps> = ({
  conversation,
  messages,
  onSendMessage,
  className = ''
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<string>('');

  const generateSuggestions = async () => {
    if (!conversation || !messages.length) return;

    setIsLoading(true);
    try {
      const lastCustomerMessage = messages
        .filter(msg => msg.direction === 'in')
        .slice(-1)[0];

      if (!lastCustomerMessage) {
        setIsLoading(false);
        return;
      }

      const messageContext: MessageContext = {
        leadId: conversation.leadId,
        leadName: conversation.leadName || 'there',
        latestMessage: lastCustomerMessage.body,
        conversationHistory: messages.map(m => m.body),
        vehicleInterest: conversation.vehicleInterest || ''
      };

      // Generate multiple response variations
      const suggestions: string[] = [];
      for (let i = 0; i < 3; i++) {
        const response = await unifiedAIResponseEngine.generateResponse(messageContext);
        if (response?.message && !suggestions.includes(response.message)) {
          suggestions.push(response.message);
        }
      }

      setSuggestions(suggestions);
      setLastGenerated(Date.now().toString());
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      toast({
        title: "Error",
        description: "Failed to generate AI suggestions",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendSuggestion = async (suggestion: string) => {
    try {
      await onSendMessage(suggestion);
      toast({
        title: "Message Sent",
        description: "AI suggestion sent successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (conversation && messages.length > 0) {
      generateSuggestions();
    }
  }, [conversation?.leadId, messages.length]);

  if (!conversation) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">Select a conversation to see AI suggestions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            AI Suggestions
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={generateSuggestions}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {isLoading && suggestions.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
            <span className="ml-2 text-sm text-gray-600">Generating suggestions...</span>
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <div key={index} className="border rounded-lg p-3 bg-gray-50">
                <p className="text-sm text-gray-700 mb-2">{suggestion}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSendSuggestion(suggestion)}
                  className="ml-auto"
                >
                  <Send className="h-3 w-3 mr-1" />
                  Use This
                </Button>
              </div>
            ))}
          </div>
        )}

        {!isLoading && suggestions.length === 0 && (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500">No suggestions available</p>
            <p className="text-xs text-gray-400 mt-1">Try refreshing or check if there are recent customer messages</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIResponseSuggestionPanel;
