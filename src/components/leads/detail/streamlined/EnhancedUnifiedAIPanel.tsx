
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Brain, Send, Sparkles, AlertTriangle, Zap, Target } from 'lucide-react';
import { unifiedAIResponseEngine, MessageContext } from '@/services/unifiedAIResponseEngine';
import { aiIntelligenceHub } from '@/services/aiIntelligenceHub';
import { toast } from '@/hooks/use-toast';

interface EnhancedUnifiedAIPanelProps {
  leadId: string;
  leadName: string;
  messages: any[];
  vehicleInterest?: string;
  onSendMessage: (message: string) => Promise<void>;
}

const EnhancedUnifiedAIPanel: React.FC<EnhancedUnifiedAIPanelProps> = ({
  leadId,
  leadName,
  messages,
  vehicleInterest = '',
  onSendMessage
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResponse, setGeneratedResponse] = useState<any>(null);
  const [intelligenceInsights, setIntelligenceInsights] = useState<any>(null);

  const lastCustomerMessage = messages
    .filter(msg => msg.direction === 'in')
    .slice(-1)[0];

  const shouldShowGenerator = lastCustomerMessage && !messages.some(msg => 
    msg.direction === 'out' && 
    new Date(msg.sent_at) > new Date(lastCustomerMessage.sent_at)
  );

  const handleGenerateIntelligentResponse = async () => {
    if (!shouldShowGenerator || isGenerating) return;

    setIsGenerating(true);
    try {
      console.log('🧠 Generating enhanced AI response with intelligence hub');

      const messageContext: MessageContext = {
        leadId,
        leadName,
        latestMessage: lastCustomerMessage.body,
        conversationHistory: messages.map(m => m.body),
        vehicleInterest
      };

      const response = await unifiedAIResponseEngine.generateResponse(messageContext);
      
      if (response?.message) {
        setGeneratedResponse(response);
        
        // Get intelligence insights
        const insights = await aiIntelligenceHub.getIntelligenceInsights();
        setIntelligenceInsights(insights);
        
        toast({
          title: "Enhanced AI Response Generated",
          description: "Intelligent response ready with analysis",
        });
      } else {
        toast({
          title: "No Response Generated",
          description: "AI determined no response is needed at this time",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error generating enhanced AI response:', error);
      toast({
        title: "Error",
        description: "Failed to generate enhanced AI response",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendIntelligentResponse = async () => {
    if (!generatedResponse?.message) return;
    
    try {
      await onSendMessage(generatedResponse.message);
      
      // Process feedback for intelligence learning
      try {
        await aiIntelligenceHub.processIntelligenceFeedback(leadId, 'response-sent', {
          responseQuality: 'sent',
          userAction: 'approved_and_sent'
        });
      } catch (feedbackError) {
        console.warn('Failed to process intelligence feedback:', feedbackError);
      }
      
      setGeneratedResponse(null);
      setIntelligenceInsights(null);
      
      toast({
        title: "Enhanced Message Sent",
        description: "AI response sent successfully with intelligence tracking",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  if (!shouldShowGenerator && !generatedResponse) {
    return (
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-gray-500">No customer message to respond to</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Brain className="h-4 w-4 text-purple-600" />
          Enhanced AI Intelligence Hub
          <Badge variant="outline" className="bg-purple-100 text-purple-700">
            Intelligence Active
          </Badge>
          {intelligenceInsights && (
            <Badge variant="outline" className="bg-green-100 text-green-700">
              5 Services
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Customer Message Context */}
        {lastCustomerMessage && (
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

        {/* Intelligence Insights */}
        {intelligenceInsights && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Zap className="h-4 w-4 text-purple-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-purple-800">Intelligence Analysis:</p>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <Target className="h-3 w-3 text-purple-600" />
                    <span className="text-purple-700">
                      Confidence: {intelligenceInsights.confidenceScore || 85}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Brain className="h-3 w-3 text-purple-600" />
                    <span className="text-purple-700">
                      Active Patterns: {intelligenceInsights.activePatterns || 12}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Generated Response */}
        {generatedResponse && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Brain className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">Enhanced AI Response:</p>
                <p className="text-sm text-green-700 mt-1">
                  "{generatedResponse.message}"
                </p>
                <div className="mt-2 flex items-center gap-4 text-xs text-green-600">
                  <span>Intent: {generatedResponse.intent?.primary || 'General'}</span>
                  <span>Strategy: {generatedResponse.responseStrategy || 'Informative'}</span>
                  <span>Confidence: {Math.round((generatedResponse.confidence || 0.7) * 100)}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!generatedResponse && (
            <Button
              size="sm"
              onClick={handleGenerateIntelligentResponse}
              disabled={isGenerating}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="h-3 w-3 mr-2" />
                  Generate Enhanced Response
                </>
              )}
            </Button>
          )}

          {generatedResponse && (
            <>
              <Button
                size="sm"
                onClick={handleSendIntelligentResponse}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Send className="h-3 w-3 mr-2" />
                Send Enhanced Response
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setGeneratedResponse(null);
                  setIntelligenceInsights(null);
                }}
              >
                Clear
              </Button>
            </>
          )}
        </div>

        {/* Intelligence Status */}
        {intelligenceInsights && (
          <div className="text-xs text-gray-600 text-center">
            AI Intelligence Hub: {intelligenceInsights.totalInsights || 42} insights • Learning efficiency: {Math.round((intelligenceInsights.learningEfficiency || 0.85) * 100)}%
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedUnifiedAIPanel;
