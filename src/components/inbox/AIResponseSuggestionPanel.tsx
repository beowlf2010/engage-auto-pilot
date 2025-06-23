
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, RefreshCw, Send, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AIResponseSuggestionPanelProps {
  selectedConversation: any;
  messages: any[];
  onSendMessage: (message: string) => Promise<void>;
  canReply: boolean;
}

const AIResponseSuggestionPanel: React.FC<AIResponseSuggestionPanelProps> = ({
  selectedConversation,
  messages,
  onSendMessage,
  canReply
}) => {
  const [aiSuggestion, setAiSuggestion] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [reasoning, setReasoning] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  // Generate AI response when conversation changes
  useEffect(() => {
    if (selectedConversation && messages.length > 0) {
      generateAIResponse();
    }
  }, [selectedConversation?.leadId, messages.length]);

  const generateAIResponse = async () => {
    setIsGenerating(true);
    try {
      // Simulate AI response generation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const lastMessage = messages[messages.length - 1];
      const isLastMessageFromCustomer = lastMessage?.direction === 'in';
      
      let suggestion = '';
      let suggestionReasoning = '';
      let suggestionConfidence = 0.8;

      if (isLastMessageFromCustomer) {
        // Generate response based on customer message
        const customerMessage = lastMessage.body.toLowerCase();
        
        if (customerMessage.includes('price') || customerMessage.includes('cost')) {
          suggestion = `Hi ${selectedConversation.leadName}! I understand you're interested in pricing. Let me get you the most current pricing information for the ${selectedConversation.vehicleInterest}. When would be a good time to discuss the details over the phone?`;
          suggestionReasoning = 'Customer asked about pricing - providing helpful response and trying to schedule a call';
          suggestionConfidence = 0.9;
        } else if (customerMessage.includes('available') || customerMessage.includes('stock')) {
          suggestion = `Great question! Yes, we have the ${selectedConversation.vehicleInterest} available. I'd love to show you the specific options we have in stock. Are you free for a quick call today?`;
          suggestionReasoning = 'Customer asking about availability - confirming stock and suggesting call';
          suggestionConfidence = 0.85;
        } else if (customerMessage.includes('interested') || customerMessage.includes('looking')) {
          suggestion = `That's fantastic, ${selectedConversation.leadName}! I'm excited to help you with the ${selectedConversation.vehicleInterest}. What specific features are most important to you?`;
          suggestionReasoning = 'Customer expressing interest - building rapport and gathering requirements';
          suggestionConfidence = 0.8;
        } else {
          suggestion = `Hi ${selectedConversation.leadName}! Thanks for your message. I'd be happy to help you with any questions about the ${selectedConversation.vehicleInterest}. What would you like to know more about?`;
          suggestionReasoning = 'General response to customer message - keeping conversation flowing';
          suggestionConfidence = 0.75;
        }
      } else {
        // Follow-up message
        suggestion = `Hi ${selectedConversation.leadName}! I wanted to follow up on our conversation about the ${selectedConversation.vehicleInterest}. Do you have any questions I can help answer?`;
        suggestionReasoning = 'Follow-up message to maintain engagement';
        suggestionConfidence = 0.7;
      }

      setAiSuggestion(suggestion);
      setReasoning(suggestionReasoning);
      setConfidence(suggestionConfidence);
    } catch (error) {
      console.error('Error generating AI response:', error);
      setAiSuggestion('Unable to generate response suggestion at this time.');
      setReasoning('Error in AI generation');
      setConfidence(0);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseSuggestion = async () => {
    if (!canReply || !aiSuggestion) return;
    
    try {
      await onSendMessage(aiSuggestion);
      toast({
        title: "Message Sent",
        description: "AI suggestion sent successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send AI suggestion",
        variant: "destructive"
      });
    }
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'text-green-600';
    if (conf >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-600" />
            Finn's AI Suggestion
            {confidence > 0 && (
              <Badge variant="outline" className={getConfidenceColor(confidence)}>
                {Math.round(confidence * 100)}% confident
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={generateAIResponse}
              disabled={isGenerating}
            >
              <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          {isGenerating ? (
            <div className="flex items-center justify-center py-6">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-gray-600">Finn is thinking...</span>
            </div>
          ) : aiSuggestion ? (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5" />
                  <span className="text-xs font-medium text-blue-800">Finn's Suggestion:</span>
                </div>
                <p className="text-sm text-gray-800 leading-relaxed mb-3">
                  {aiSuggestion}
                </p>
                <div className="text-xs text-gray-600 mb-3">
                  <strong>Reasoning:</strong> {reasoning}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleUseSuggestion}
                    disabled={!canReply}
                    className="flex-1"
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Use This Response
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateAIResponse}
                    disabled={isGenerating}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <Brain className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500 mb-3">No AI suggestion available</p>
              <Button
                variant="outline"
                size="sm"
                onClick={generateAIResponse}
                disabled={isGenerating}
              >
                Generate Suggestion
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default AIResponseSuggestionPanel;
