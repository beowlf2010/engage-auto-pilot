import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, RefreshCw, Send, Lightbulb, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { generateEnhancedIntelligentResponse, ConversationContext } from '@/services/intelligentConversationAI';
import { formatProperName, getFirstName } from '@/utils/nameFormatter';

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
      // Get the raw lead name and extract only the first name
      const firstName = selectedConversation.first_name || '';
      const lastName = selectedConversation.last_name || '';
      const rawLeadName = selectedConversation.leadName || `${firstName} ${lastName}`.trim();
      
      // Extract and format only the first name
      const firstNameOnly = getFirstName(rawLeadName) || formatProperName(firstName) || 'there';

      // Format messages for the enhanced AI service
      const formattedMessages = messages.map(msg => ({
        id: msg.id,
        body: msg.body || '',
        direction: msg.direction as 'in' | 'out',
        sentAt: msg.sent_at || msg.sentAt || new Date().toISOString(),
        aiGenerated: msg.ai_generated || false
      }));

      // Create context for enhanced AI response - using only first name
      const context: ConversationContext = {
        leadId: selectedConversation.id,
        leadName: firstNameOnly,
        vehicleInterest: selectedConversation.vehicleInterest || selectedConversation.vehicle_interest || 'vehicle',
        leadSource: selectedConversation.source,
        messages: formattedMessages,
        leadInfo: {
          phone: selectedConversation.phone || '',
          status: selectedConversation.status || 'active',
          lastReplyAt: messages[messages.length - 1]?.sent_at
        }
      };

      console.log('🤖 Generating enhanced AI response for context:', {
        leadId: context.leadId,
        leadName: context.leadName,
        vehicleInterest: context.vehicleInterest,
        messageCount: context.messages.length
      });

      // Use the enhanced AI service
      const aiResponse = await generateEnhancedIntelligentResponse(context);

      if (aiResponse?.message) {
        setAiSuggestion(aiResponse.message);
        setReasoning(aiResponse.reasoning || 'Enhanced AI response generated');
        setConfidence(aiResponse.confidence || 0.8);
        setSuggestionType(aiResponse.sourceStrategy || 'enhanced');
        
        console.log('✅ Enhanced AI response generated:', {
          confidence: aiResponse.confidence,
          strategy: aiResponse.sourceStrategy,
          messageLength: aiResponse.message.length
        });
      } else {
        // Fallback if enhanced AI fails - use only first name
        console.log('⚠️ Enhanced AI failed, using fallback');
        const fallbackFirstName = getFirstName(rawLeadName) || formatProperName(firstName) || 'there';
        const vehicleInterest = selectedConversation.vehicleInterest || selectedConversation.vehicle_interest || 'vehicle';
        
        setAiSuggestion(`Hi ${fallbackFirstName}! Thanks for your message about the ${vehicleInterest}. I'm here to help with any questions you might have.`);
        setReasoning('Fallback response - enhanced AI unavailable');
        setConfidence(0.5);
        setSuggestionType('fallback');
      }
    } catch (error) {
      console.error('❌ Error generating enhanced AI response:', error);
      
      // Fallback to basic response with proper first name formatting
      const firstName = selectedConversation?.first_name || '';
      const rawLeadName = selectedConversation?.leadName || firstName;
      const fallbackFirstName = getFirstName(rawLeadName) || formatProperName(firstName) || 'there';
      const vehicleInterest = selectedConversation?.vehicleInterest || selectedConversation?.vehicle_interest || 'vehicle';
      
      setAiSuggestion(`Hi ${fallbackFirstName}! Thanks for your message about the ${vehicleInterest}. I'm here to help with any questions you might have.`);
      setReasoning('Fallback response due to AI service error');
      setConfidence(0.6);
      setSuggestionType('error_fallback');
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
      case 'congratulate_competitor_purchase': return '🎉';
      case 'acknowledge_and_engage': return '👋';
      case 'provide_info': return '📋';
      case 'move_to_action': return '🎯';
      case 'address_concern': return '🛡️';
      case 'enhanced': return '🧠';
      case 'fallback': return '💬';
      case 'error_fallback': return '⚠️';
      default: return '💬';
    }
  };

  if (!canReply) return null;

  return (
    <Card className="shadow-sm border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
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
            <div className="flex items-center justify-center py-4">
              <div className="text-center">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mx-auto mb-2" />
                <span className="text-sm text-gray-600">Finn is analyzing the conversation...</span>
                <p className="text-xs text-gray-400 mt-1">Using enhanced AI detection</p>
              </div>
            </div>
          ) : aiSuggestion ? (
            <div className="space-y-3">
              <div className="bg-white border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-3">
                  <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-xs font-medium text-blue-800 block mb-1">
                      Finn's Enhanced Response:
                    </span>
                    <p className="text-sm text-gray-800 leading-relaxed mb-3">
                      {aiSuggestion}
                    </p>
                    
                    <div className="text-xs text-gray-600 mb-3 p-2 bg-gray-50 rounded border">
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
                Enhanced AI suggestions with objection detection
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default AIResponseSuggestionPanel;
