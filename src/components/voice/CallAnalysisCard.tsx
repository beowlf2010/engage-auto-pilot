import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Brain, 
  MessageSquare, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Target
} from 'lucide-react';
import { CallAnalysis, CallInsight } from '@/services/voiceAIService';

interface CallAnalysisCardProps {
  analysis: CallAnalysis;
  insights: CallInsight[];
  onActionTaken?: (insightId: string) => void;
}

const CallAnalysisCard: React.FC<CallAnalysisCardProps> = ({ 
  analysis, 
  insights,
  onActionTaken 
}) => {
  const getSentimentColor = (score?: number) => {
    if (!score) return 'bg-gray-500';
    if (score > 0.3) return 'bg-green-500';
    if (score < -0.3) return 'bg-red-500';
    return 'bg-yellow-500';
  };

  const getSentimentIcon = (score?: number) => {
    if (!score) return <MessageSquare className="w-4 h-4" />;
    if (score > 0.3) return <TrendingUp className="w-4 h-4" />;
    if (score < -0.3) return <TrendingDown className="w-4 h-4" />;
    return <MessageSquare className="w-4 h-4" />;
  };

  const getEngagementColor = (level?: string) => {
    switch (level) {
      case 'high': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Analysis Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Call Analysis Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-white text-sm ${getSentimentColor(analysis.sentiment_score)}`}>
                {getSentimentIcon(analysis.sentiment_score)}
                Sentiment: {analysis.sentiment_score ? Math.round(analysis.sentiment_score * 100) : 'N/A'}%
              </div>
            </div>
            
            <div className="text-center">
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-white text-sm ${getEngagementColor(analysis.engagement_level)}`}>
                <Target className="w-4 h-4" />
                {analysis.engagement_level?.toUpperCase() || 'UNKNOWN'} Engagement
              </div>
            </div>
            
            <div className="text-center">
              <Badge variant="outline" className="text-sm">
                Quality: {analysis.quality_score ? Math.round(analysis.quality_score * 100) : 'N/A'}%
              </Badge>
            </div>
            
            <div className="text-center">
              <Badge variant="outline" className="text-sm">
                {analysis.call_outcome_prediction?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
              </Badge>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Talk Time Ratio</span>
                <span>{analysis.talk_time_ratio ? Math.round(analysis.talk_time_ratio * 100) : 0}% Sales Rep</span>
              </div>
              <Progress 
                value={analysis.talk_time_ratio ? analysis.talk_time_ratio * 100 : 0} 
                className="h-2"
              />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Confidence Score</span>
                <span>{analysis.confidence_score ? Math.round(analysis.confidence_score * 100) : 0}%</span>
              </div>
              <Progress 
                value={analysis.confidence_score ? analysis.confidence_score * 100 : 0} 
                className="h-2"
              />
            </div>
          </div>

          {/* Summary */}
          {analysis.conversation_summary && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Conversation Summary</h4>
              <p className="text-sm text-gray-700">{analysis.conversation_summary}</p>
            </div>
          )}

          {/* AI Recommendations */}
          {analysis.ai_recommendations && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="font-semibold text-sm mb-2 text-blue-800">AI Recommendations</h4>
              <p className="text-sm text-blue-700">{analysis.ai_recommendations}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Buying Signals */}
      {analysis.buying_signals && analysis.buying_signals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <TrendingUp className="w-5 h-5" />
              Buying Signals ({analysis.buying_signals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analysis.buying_signals.map((signal, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm flex-1">{signal.text}</span>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(signal.confidence * 100)}% confident
                  </Badge>
                  <Badge 
                    variant={signal.strength === 'strong' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {signal.strength}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Objections */}
      {analysis.objections_raised && analysis.objections_raised.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Objections Raised ({analysis.objections_raised.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analysis.objections_raised.map((objection, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-red-50 rounded">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="text-sm flex-1">{objection.text}</span>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(objection.confidence * 100)}% confident
                  </Badge>
                  <Badge variant="destructive" className="text-xs">
                    {objection.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Actions */}
      {analysis.next_actions && analysis.next_actions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recommended Next Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analysis.next_actions.map((action, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm flex-1">{action.action}</span>
                  <Badge 
                    variant={getPriorityColor(action.priority)} 
                    className="text-xs"
                  >
                    {action.priority} priority
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {action.timeline}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actionable Insights */}
      {insights.filter(i => i.actionable && !i.action_taken).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Actionable Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights
                .filter(i => i.actionable && !i.action_taken)
                .map((insight) => (
                  <div key={insight.id} className="flex items-center gap-2 p-3 border rounded-lg">
                    <div className="flex-1">
                      <Badge variant="outline" className="text-xs mb-1">
                        {insight.insight_type.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <p className="text-sm">{insight.insight_text}</p>
                      {insight.confidence_score && (
                        <p className="text-xs text-gray-500 mt-1">
                          Confidence: {Math.round(insight.confidence_score * 100)}%
                        </p>
                      )}
                    </div>
                    {onActionTaken && (
                      <Button
                        size="sm"
                        onClick={() => onActionTaken(insight.id)}
                        className="shrink-0"
                      >
                        Mark Done
                      </Button>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Topics Discussed */}
      {analysis.topics_discussed && analysis.topics_discussed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Topics Discussed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {analysis.topics_discussed.map((topic, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {topic}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CallAnalysisCard;