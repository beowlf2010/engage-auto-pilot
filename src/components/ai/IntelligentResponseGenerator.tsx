import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  MessageSquare, Sparkles, Target, Brain, 
  Copy, Send, RefreshCw, TrendingUp,
  Zap, CheckCircle, AlertCircle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { analyzeConversationIntelligence, type SmartFinnAnalysis } from '@/services/smartFinnAI';

interface ResponseOption {
  id: string;
  type: 'opener' | 'objection_handler' | 'value_prop' | 'closer' | 'follow_up';
  message: string;
  tone: 'professional' | 'friendly' | 'consultative' | 'urgent';
  effectiveness: number;
  reasoning: string;
  personalized: boolean;
}

interface IntelligentResponseGeneratorProps {
  leadId: string;
  conversationHistory?: any[];
  onMessageSelect?: (message: string) => void;
  onMessageSend?: (message: string) => void;
}

const IntelligentResponseGenerator: React.FC<IntelligentResponseGeneratorProps> = ({
  leadId,
  conversationHistory = [],
  onMessageSelect,
  onMessageSend
}) => {
  const [analysis, setAnalysis] = useState<SmartFinnAnalysis | null>(null);
  const [responseOptions, setResponseOptions] = useState<ResponseOption[]>([]);
  const [selectedResponse, setSelectedResponse] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [generatingResponses, setGeneratingResponses] = useState(false);

  useEffect(() => {
    loadIntelligenceAndGenerateResponses();
  }, [leadId]);

  const loadIntelligenceAndGenerateResponses = async () => {
    try {
      setLoading(true);
      const analysisData = await analyzeConversationIntelligence(leadId);
      setAnalysis(analysisData);
      
      await generateIntelligentResponses(analysisData);
    } catch (error) {
      console.error('Error loading intelligence:', error);
      toast({
        title: 'Error',
        description: 'Failed to analyze conversation',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const generateIntelligentResponses = async (analysis: SmartFinnAnalysis) => {
    try {
      setGeneratingResponses(true);
      const responses: ResponseOption[] = [];

      // Generate responses based on analysis
      
      // 1. Address buying signals
      if (analysis.buyingSignals.length > 0) {
        const urgentSignals = analysis.buyingSignals.filter(s => s.type === 'timeline_urgency');
        if (urgentSignals.length > 0) {
          responses.push({
            id: 'urgent-response',
            type: 'opener',
            message: `I understand you're looking to move quickly on this. I have immediate availability to discuss your options and can expedite the process to meet your timeline. When would be the best time for a quick call today?`,
            tone: 'urgent',
            effectiveness: 85,
            reasoning: 'Addresses timeline urgency while maintaining consultative approach',
            personalized: true
          });
        }

        const budgetSignals = analysis.buyingSignals.filter(s => s.type === 'budget_mentioned');
        if (budgetSignals.length > 0) {
          responses.push({
            id: 'budget-response',
            type: 'value_prop',
            message: `I appreciate you sharing your budget range with me. Based on what you've mentioned, I have several excellent options that would work perfectly within your parameters. Let me show you how we can maximize value while staying comfortable with your investment.`,
            tone: 'consultative',
            effectiveness: 80,
            reasoning: 'Acknowledges budget while positioning value',
            personalized: true
          });
        }
      }

      // 2. Handle objections
      analysis.objections.forEach(objection => {
        if (objection.type === 'price') {
          responses.push({
            id: `objection-${objection.type}`,
            type: 'objection_handler',
            message: `I understand price is an important consideration. What I'd like to show you is how this investment actually saves you money in the long run through reliability, fuel efficiency, and our comprehensive warranty. Plus, I have financing options that can make this very affordable. Would you like to see some numbers?`,
            tone: 'professional',
            effectiveness: objection.successProbability,
            reasoning: objection.handlingStrategy,
            personalized: true
          });
        } else if (objection.type === 'timing') {
          responses.push({
            id: `objection-${objection.type}`,
            type: 'objection_handler',
            message: `I completely understand wanting to take your time with this decision. What I can do is hold this vehicle for you at today's pricing while you consider your options. This way, you're not pressured but you're also protected if someone else shows interest. Fair enough?`,
            tone: 'consultative',
            effectiveness: objection.successProbability,
            reasoning: objection.handlingStrategy,
            personalized: true
          });
        }
      });

      // 3. Personality-based responses
      if (analysis.personalityProfile.communicationStyle === 'analytical') {
        responses.push({
          id: 'analytical-response',
          type: 'value_prop',
          message: `I've prepared a detailed comparison showing how this vehicle ranks against competitors in key metrics: reliability ratings, total cost of ownership, safety scores, and resale value. The data clearly shows this is the smart choice. Would you like me to walk through these numbers with you?`,
          tone: 'professional',
          effectiveness: 75,
          reasoning: 'Appeals to analytical decision-making style',
          personalized: true
        });
      } else if (analysis.personalityProfile.communicationStyle === 'expressive') {
        responses.push({
          id: 'expressive-response',
          type: 'opener',
          message: `I'm genuinely excited about this match! This vehicle has everything you mentioned wanting, and I can already picture how perfect it's going to be for you and your family. The feeling you'll get driving this off the lot is going to be incredible. When can we make this happen?`,
          tone: 'friendly',
          effectiveness: 78,
          reasoning: 'Appeals to emotional decision-making style',
          personalized: true
        });
      }

      // 4. Decision maker considerations
      if (!analysis.decisionMakerStatus.isPrimaryDecisionMaker) {
        responses.push({
          id: 'stakeholder-response',
          type: 'follow_up',
          message: `I know this is an important decision for your family. Would it be helpful if I prepared some information you could share with your spouse? I can put together a summary of the key benefits and financing options that might make the conversation easier.`,
          tone: 'consultative',
          effectiveness: 70,
          reasoning: 'Acknowledges multiple decision makers',
          personalized: true
        });
      }

      // 5. Competitive threats
      if (analysis.competitiveThreats.length > 0) {
        const competitor = analysis.competitiveThreats[0];
        responses.push({
          id: 'competitive-response',
          type: 'value_prop',
          message: `I noticed you mentioned ${competitor.competitor}. They make good vehicles, but let me show you why our customers consistently choose us over them: ${competitor.advantagePoints.join(', ')}. Plus, our local service and support is unmatched in this area.`,
          tone: 'professional',
          effectiveness: 75,
          reasoning: competitor.counterStrategy,
          personalized: true
        });
      }

      // 6. Closing opportunities
      if (analysis.buyingProbability > 70) {
        responses.push({
          id: 'closing-opportunity',
          type: 'closer',
          message: `Based on everything we've discussed, this feels like the perfect fit for you. I can have everything ready for you to drive it home today. What questions can I answer to help you move forward with confidence?`,
          tone: 'consultative',
          effectiveness: 85,
          reasoning: 'Strong closing attempt for high-probability buyer',
          personalized: true
        });
      }

      // 7. Generic high-quality responses
      responses.push(
        {
          id: 'rapport-builder',
          type: 'opener',
          message: `I've been thinking about our conversation, and I believe I have the perfect solution for what you're looking for. When would be a good time to discuss the details?`,
          tone: 'friendly',
          effectiveness: 65,
          reasoning: 'Builds rapport and creates curiosity',
          personalized: false
        },
        {
          id: 'value-focused',
          type: 'value_prop',
          message: `What sets us apart is our commitment to your complete satisfaction - not just today, but for years to come. Our customers become family, and we take care of our family. Let me show you what that means.`,
          tone: 'consultative',
          effectiveness: 70,
          reasoning: 'Emphasizes long-term relationship and service',
          personalized: false
        }
      );

      // Sort by effectiveness
      responses.sort((a, b) => b.effectiveness - a.effectiveness);
      
      setResponseOptions(responses.slice(0, 6)); // Limit to top 6 responses
    } catch (error) {
      console.error('Error generating responses:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate response options',
        variant: 'destructive'
      });
    } finally {
      setGeneratingResponses(false);
    }
  };

  const handleSelectResponse = (response: ResponseOption) => {
    setSelectedResponse(response.message);
    setCustomMessage(response.message);
    onMessageSelect?.(response.message);
  };

  const handleSendMessage = () => {
    if (customMessage.trim()) {
      onMessageSend?.(customMessage);
      setCustomMessage('');
      setSelectedResponse('');
      toast({
        title: 'Message Sent',
        description: 'Your intelligent response has been sent',
      });
    }
  };

  const handleCopyMessage = (message: string) => {
    navigator.clipboard.writeText(message);
    toast({
      title: 'Copied',
      description: 'Message copied to clipboard',
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'opener': return <MessageSquare className="w-4 h-4" />;
      case 'objection_handler': return <AlertCircle className="w-4 h-4" />;
      case 'value_prop': return <TrendingUp className="w-4 h-4" />;
      case 'closer': return <Target className="w-4 h-4" />;
      case 'follow_up': return <CheckCircle className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'opener': return 'bg-blue-100 text-blue-800';
      case 'objection_handler': return 'bg-yellow-100 text-yellow-800';
      case 'value_prop': return 'bg-green-100 text-green-800';
      case 'closer': return 'bg-purple-100 text-purple-800';
      case 'follow_up': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 animate-pulse" />
            Generating Intelligent Responses...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-20 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-20 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-20 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI-Generated Response Options */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Finn's Intelligent Response Suggestions
            </CardTitle>
            <Button 
              onClick={loadIntelligenceAndGenerateResponses}
              size="sm"
              variant="outline"
              disabled={generatingResponses}
            >
              <RefreshCw className={`w-4 h-4 ${generatingResponses ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {analysis && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-4 text-sm">
                <span>Buy Probability: <strong>{analysis.buyingProbability}%</strong></span>
                <span>Urgency: <strong className={`capitalize ${analysis.urgencyLevel === 'critical' ? 'text-red-600' : analysis.urgencyLevel === 'high' ? 'text-orange-600' : 'text-green-600'}`}>
                  {analysis.urgencyLevel}
                </strong></span>
                <span>Signals: <strong>{analysis.buyingSignals.length}</strong></span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {responseOptions.map((response) => (
              <div 
                key={response.id} 
                className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                  selectedResponse === response.message ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => handleSelectResponse(response)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded ${getTypeColor(response.type)}`}>
                      {getTypeIcon(response.type)}
                    </div>
                    <Badge 
                      variant={response.personalized ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {response.personalized ? 'Personalized' : 'Generic'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {response.effectiveness}% effective
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyMessage(response.message);
                    }}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                
                <div className="text-sm mb-2">{response.message}</div>
                
                <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  <strong>Why this works:</strong> {response.reasoning}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Message Composer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Compose & Send
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Type your message here or select from the AI suggestions above..."
            rows={4}
            className="resize-none"
          />
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {customMessage.length > 0 && (
                <span>{customMessage.length} characters</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCustomMessage('')}
                disabled={!customMessage}
              >
                Clear
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={!customMessage.trim()}
                className="flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send Message
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IntelligentResponseGenerator;