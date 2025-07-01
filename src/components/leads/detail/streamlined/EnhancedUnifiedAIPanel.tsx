
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Send, 
  Sparkles, 
  AlertTriangle, 
  TrendingUp, 
  Target,
  Zap,
  Eye
} from 'lucide-react';
import { aiIntelligenceHub } from '@/services/aiIntelligenceHub';
import { MessageContext } from '@/services/unifiedAIResponseEngine';
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
  const [intelligentResponse, setIntelligentResponse] = useState<any>(null);
  const [showInsights, setShowInsights] = useState(false);

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
      console.log('🧠 Generating intelligent AI response using full AI stack');

      const messageContext: MessageContext = {
        leadId,
        leadName,
        latestMessage: lastCustomerMessage.body,
        conversationHistory: messages.map(m => m.body),
        vehicleInterest
      };

      const response = await aiIntelligenceHub.generateIntelligentResponse(messageContext);
      
      if (response && response.message) {
        setIntelligentResponse(response);
        toast({
          title: "Intelligent AI Response Generated",
          description: `Applied ${response.intelligence_factors.length} intelligence factors with ${Math.round(response.confidence * 100)}% confidence`,
        });
      } else {
        toast({
          title: "No Response Generated",
          description: "AI intelligence determined no response is needed at this time",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error generating intelligent AI response:', error);
      toast({
        title: "Error",
        description: "Failed to generate intelligent AI response",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendIntelligentResponse = async () => {
    if (!intelligentResponse?.message) return;
    
    try {
      await onSendMessage(intelligentResponse.message);
      
      // Process feedback
      await aiIntelligenceHub.processIntelligenceFeedback(
        leadId,
        'response_' + Date.now(),
        {
          response_received: true,
          user_satisfaction: 0.8
        }
      );
      
      setIntelligentResponse(null);
      toast({
        title: "Intelligent Response Sent",
        description: "AI-powered response sent with full intelligence enhancement",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send intelligent response",
        variant: "destructive"
      });
    }
  };

  if (!shouldShowGenerator && !intelligentResponse) {
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
            <Zap className="h-3 w-3 mr-1" />
            5 AI Services
          </Badge>
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

        {/* Intelligent Response */}
        {intelligentResponse && (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Brain className="h-4 w-4 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-green-800">Intelligent Response:</p>
                    <Badge 
                      variant="outline" 
                      className="bg-green-100 text-green-700 text-xs"
                    >
                      {Math.round(intelligentResponse.confidence * 100)}% confidence
                    </Badge>
                  </div>
                  <p className="text-sm text-green-700">
                    "{intelligentResponse.message}"
                  </p>
                </div>
              </div>
            </div>

            {/* Intelligence Factors */}
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-800">Applied Intelligence:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {intelligentResponse.intelligence_factors.map((factor: string, index: number) => (
                  <Badge 
                    key={index}
                    variant="secondary" 
                    className="text-xs"
                  >
                    {factor.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
              
              {intelligentResponse.inventory_recommendations.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-600">
                    {intelligentResponse.inventory_recommendations.length} vehicle recommendations available
                  </p>
                </div>
              )}
            </div>

            {/* Decision Reasoning */}
            {intelligentResponse.decision_reasoning.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">Decision Factors:</span>
                </div>
                <ul className="text-xs text-amber-700 space-y-1">
                  {intelligentResponse.decision_reasoning.map((reason: string, index: number) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="text-amber-500 mt-0.5">•</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!intelligentResponse && (
            <Button
              size="sm"
              onClick={handleGenerateIntelligentResponse}
              disabled={isGenerating}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {isGenerating ? (
                <>
                  <Brain className="h-3 w-3 mr-2 animate-pulse" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="h-3 w-3 mr-2" />
                  Generate Intelligent Response
                </>
              )}
            </Button>
          )}

          {intelligentResponse && (
            <>
              <Button
                size="sm"
                onClick={handleSendIntelligentResponse}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Send className="h-3 w-3 mr-2" />
                Send Response
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIntelligentResponse(null)}
              >
                Clear
              </Button>
            </>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowInsights(!showInsights)}
          >
            <Eye className="h-3 w-3 mr-1" />
            Insights
          </Button>
        </div>

        {/* Intelligence Insights */}
        {showInsights && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-2 font-medium">Active AI Services:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Decision Intelligence
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Inventory Awareness
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Personalization
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Global Learning
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Auto Optimization
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedUnifiedAIPanel;
