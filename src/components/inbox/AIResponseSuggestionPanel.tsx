
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, RefreshCw, Send, Lightbulb, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
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
  const [suggestionType, setSuggestionType] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [lastInboundMessageId, setLastInboundMessageId] = useState<string | null>(null);

  // Generate AI response when new inbound message arrives
  useEffect(() => {
    if (!selectedConversation || !messages.length) return;

    const lastMessage = messages[messages.length - 1];
    const isInbound = lastMessage?.direction === 'in';
    
    // Only generate for new inbound messages
    if (isInbound && lastMessage.id !== lastInboundMessageId) {
      setLastInboundMessageId(lastMessage.id);
      generateAIResponse();
    }
  }, [messages, selectedConversation, lastInboundMessageId]);

  const generateAIResponse = async () => {
    setIsGenerating(true);
    try {
      // Simulate AI response generation with more sophisticated logic
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const lastMessage = messages[messages.length - 1];
      const customerMessage = lastMessage?.body?.toLowerCase() || '';
      const leadName = selectedConversation?.leadName || 'there';
      const vehicleInterest = selectedConversation?.vehicleInterest || 'vehicle';
      
      let suggestion = '';
      let suggestionReasoning = '';
      let suggestionConfidence = 0.8;
      let type = 'general';

      // Analyze customer message intent and generate appropriate response
      if (customerMessage.includes('price') || customerMessage.includes('cost') || customerMessage.includes('payment')) {
        suggestion = `Hi ${leadName}! I understand you're interested in pricing for the ${vehicleInterest}. I'd be happy to go over our current pricing and available financing options with you. When would be a good time for a quick call to discuss the details?`;
        suggestionReasoning = 'Customer inquired about pricing - providing helpful response and suggesting a call to discuss details';
        suggestionConfidence = 0.92;
        type = 'pricing';
      } else if (customerMessage.includes('available') || customerMessage.includes('stock') || customerMessage.includes('inventory')) {
        suggestion = `Great question, ${leadName}! Yes, we currently have the ${vehicleInterest} available. I'd love to show you the specific options we have in stock and help you find the perfect match. Are you available for a quick call today to go over the details?`;
        suggestionReasoning = 'Customer asking about availability - confirming stock and suggesting immediate follow-up';
        suggestionConfidence = 0.89;
        type = 'availability';
      } else if (customerMessage.includes('interested') || customerMessage.includes('looking') || customerMessage.includes('want')) {
        suggestion = `That's fantastic, ${leadName}! I'm excited to help you with the ${vehicleInterest}. To make sure I find you the perfect vehicle, what specific features or options are most important to you? Color, trim level, any specific must-haves?`;
        suggestionReasoning = 'Customer expressing interest - building rapport and gathering specific requirements';
        suggestionConfidence = 0.85;
        type = 'interest';
      } else if (customerMessage.includes('test drive') || customerMessage.includes('see') || customerMessage.includes('visit')) {
        suggestion = `Absolutely, ${leadName}! I'd love to set up a test drive for you. The ${vehicleInterest} drives beautifully and I think you'll really enjoy it. What day and time works best for you this week? I can also prepare any specific models you'd like to see.`;
        suggestionReasoning = 'Customer wants to see/test drive vehicle - facilitating immediate scheduling';
        suggestionConfidence = 0.94;
        type = 'test_drive';
      } else if (customerMessage.includes('thank') || customerMessage.includes('thanks')) {
        suggestion = `You're very welcome, ${leadName}! I'm here to help make this process as smooth as possible for you. Is there anything else about the ${vehicleInterest} you'd like to know, or would you like to take the next step and schedule a time to see it in person?`;
        suggestionReasoning = 'Customer expressing gratitude - maintaining positive momentum and suggesting next steps';
        suggestionConfidence = 0.87;
        type = 'gratitude';
      } else if (customerMessage.includes('no') || customerMessage.includes('not interested') || customerMessage.includes('stop')) {
        suggestion = `I completely understand, ${leadName}. No pressure at all! If your situation changes in the future or you have any questions about the ${vehicleInterest}, please don't hesitate to reach out. Have a great day!`;
        suggestionReasoning = 'Customer declining or showing disinterest - respectful acknowledgment with door left open';
        suggestionConfidence = 0.91;
        type = 'objection';
      } else {
        // General response for unclear messages
        suggestion = `Hi ${leadName}! Thanks for your message about the ${vehicleInterest}. I want to make sure I give you the most helpful information. Could you let me know what specific questions you have or what would be most helpful for me to cover with you?`;
        suggestionReasoning = 'General response to unclear message - seeking clarification to provide better help';
        suggestionConfidence = 0.76;
        type = 'clarification';
      }

      setAiSuggestion(suggestion);
      setReasoning(suggestionReasoning);
      setConfidence(suggestionConfidence);
      setSuggestionType(type);
    } catch (error) {
      console.error('Error generating AI response:', error);
      setAiSuggestion('Unable to generate response suggestion at this time.');
      setReasoning('Error in AI generation');
      setConfidence(0);
      setSuggestionType('error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendSuggestion = async () => {
    if (!canReply || !aiSuggestion || aiSuggestion.includes('Unable to generate')) return;
    
    try {
      await onSendMessage(aiSuggestion);
      toast({
        title: "AI Response Sent",
        description: "Finn's suggested response has been sent successfully",
      });
      
      // Clear the suggestion after sending
      setAiSuggestion('');
      setReasoning('');
      setConfidence(0);
      setSuggestionType('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send AI suggestion",
        variant: "destructive"
      });
    }
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.9) return 'text-green-700 bg-green-100';
    if (conf >= 0.8) return 'text-green-600 bg-green-50';
    if (conf >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pricing': return '💰';
      case 'availability': return '📦';
      case 'interest': return '❤️';
      case 'test_drive': return '🚗';
      case 'gratitude': return '🙏';
      case 'objection': return '✋';
      case 'clarification': return '❓';
      default: return '💬';
    }
  };

  if (!canReply) return null;

  return (
    <Card className="shadow-sm border-blue-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4 text-blue-600" />
            <Sparkles className="h-3 w-3 text-yellow-500" />
            Finn's AI Response
            {confidence > 0 && (
              <Badge className={`text-xs ${getConfidenceColor(confidence)}`}>
                {Math.round(confidence * 100)}% confident
              </Badge>
            )}
            {suggestionType && (
              <span className="text-sm">{getTypeIcon(suggestionType)}</span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={generateAIResponse}
              disabled={isGenerating}
              title="Regenerate suggestion"
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
              <div className="text-center">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mx-auto mb-2" />
                <span className="text-sm text-gray-600">Finn is analyzing the conversation...</span>
                <p className="text-xs text-gray-400 mt-1">Generating personalized response</p>
              </div>
            </div>
          ) : aiSuggestion ? (
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-3">
                  <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-xs font-medium text-blue-800 block mb-1">
                      Finn's Suggested Response:
                    </span>
                    <p className="text-sm text-gray-800 leading-relaxed mb-3">
                      {aiSuggestion}
                    </p>
                    
                    <div className="text-xs text-gray-600 mb-3 p-2 bg-white/50 rounded border">
                      <strong>AI Reasoning:</strong> {reasoning}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSendSuggestion}
                        disabled={!canReply || aiSuggestion.includes('Unable to generate')}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Send This Response
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={generateAIResponse}
                        disabled={isGenerating}
                        title="Generate new suggestion"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <Brain className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500 mb-3">
                Finn will suggest responses for inbound messages
              </p>
              <p className="text-xs text-gray-400">
                AI suggestions appear automatically when customers message you
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default AIResponseSuggestionPanel;
