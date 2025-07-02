import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Bot, 
  Brain, 
  Lightbulb, 
  TrendingUp, 
  Clock, 
  Target,
  MessageSquareText,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { ConversationListItem } from '@/hooks/conversation/conversationTypes';

interface AIInsight {
  type: 'buying_signal' | 'urgency' | 'sentiment' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  priority: 'low' | 'medium' | 'high';
}

interface AIRecommendation {
  action: string;
  reason: string;
  expectedOutcome: string;
  confidence: number;
}

interface InlineAIAssistantProps {
  conversation?: ConversationListItem;
  insights?: AIInsight[];
  recommendations?: AIRecommendation[];
  isVisible?: boolean;
  onToggleVisibility?: () => void;
  isLoading?: boolean;
}

export const InlineAIAssistant: React.FC<InlineAIAssistantProps> = ({
  conversation,
  insights = [],
  recommendations = [],
  isVisible = true,
  onToggleVisibility,
  isLoading = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeInsights, setActiveInsights] = useState<AIInsight[]>([]);

  // Mock AI insights generation
  useEffect(() => {
    if (conversation && !isLoading) {
      // Generate mock insights based on conversation data
      const mockInsights: AIInsight[] = [];

      if (conversation.vehicleInterest) {
        mockInsights.push({
          type: 'buying_signal',
          title: 'Strong Vehicle Interest Detected',
          description: `Customer has expressed interest in ${conversation.vehicleInterest}`,
          confidence: 0.85,
          actionable: true,
          priority: 'high'
        });
      }

      if (conversation.unreadCount > 2) {
        mockInsights.push({
          type: 'urgency',
          title: 'High Engagement Level',
          description: `Customer has sent ${conversation.unreadCount} messages - showing active interest`,
          confidence: 0.9,
          actionable: true,
          priority: 'high'
        });
      }

      if (conversation.lastMessage?.includes('price') || conversation.lastMessage?.includes('cost')) {
        mockInsights.push({
          type: 'buying_signal',
          title: 'Price Inquiry Detected',
          description: 'Customer is asking about pricing - ready for negotiation phase',
          confidence: 0.78,
          actionable: true,
          priority: 'medium'
        });
      }

      mockInsights.push({
        type: 'recommendation',
        title: 'AI Recommendation',
        description: 'Consider scheduling a test drive or showroom visit',
        confidence: 0.72,
        actionable: true,
        priority: 'medium'
      });

      setActiveInsights(mockInsights);
    }
  }, [conversation, isLoading]);

  if (!isVisible) return null;

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'buying_signal': return TrendingUp;
      case 'urgency': return AlertCircle;
      case 'sentiment': return Brain;
      case 'recommendation': return Lightbulb;
      default: return Bot;
    }
  };

  const getInsightColor = (type: AIInsight['type'], priority: string) => {
    if (priority === 'high') return 'text-red-600 bg-red-50 border-red-200';
    if (priority === 'medium') return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-blue-600 bg-blue-50 border-blue-200';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-white/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Bot className="h-4 w-4 text-blue-600" />
                AI Assistant
                {activeInsights.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {activeInsights.length} insight{activeInsights.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                {isLoading && (
                  <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-blue-600" />
                )}
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {isLoading ? (
              <div className="text-center py-4">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4 mx-auto" />
                  <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
                </div>
              </div>
            ) : (
              <>
                {/* AI Insights */}
                {activeInsights.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">AI Insights</span>
                    </div>
                    
                    {activeInsights.map((insight, index) => {
                      const Icon = getInsightIcon(insight.type);
                      return (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border ${getInsightColor(insight.type, insight.priority)}`}
                        >
                          <div className="flex items-start gap-2">
                            <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="text-sm font-medium">{insight.title}</h4>
                                <div className="flex items-center gap-1">
                                  <span className={`text-xs font-medium ${getConfidenceColor(insight.confidence)}`}>
                                    {Math.round(insight.confidence * 100)}%
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs opacity-80">{insight.description}</p>
                              
                              {insight.actionable && (
                                <div className="mt-2">
                                  <Button size="sm" variant="ghost" className="h-6 text-xs">
                                    <Target className="h-3 w-3 mr-1" />
                                    Take Action
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* AI Recommendations */}
                {recommendations.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm font-medium">Recommendations</span>
                      </div>
                      
                      {recommendations.map((rec, index) => (
                        <div key={index} className="bg-white rounded-lg border p-3">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="text-sm font-medium">{rec.action}</h4>
                            <Progress value={rec.confidence * 100} className="w-16 h-2" />
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{rec.reason}</p>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span className="text-xs text-green-700">{rec.expectedOutcome}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Quick Actions */}
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    AI last updated: {new Date().toLocaleTimeString()}
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-6 text-xs">
                      <MessageSquareText className="h-3 w-3 mr-1" />
                      Generate Response
                    </Button>
                    <Button size="sm" variant="outline" className="h-6 text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      Schedule Follow-up
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};