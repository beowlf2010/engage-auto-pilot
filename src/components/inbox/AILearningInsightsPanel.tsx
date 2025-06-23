
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Zap, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Sparkles,
  BarChart3
} from 'lucide-react';

interface AILearningInsightsPanelProps {
  leadId: string;
  insights: any;
  optimizationQueue: any[];
  isLearning: boolean;
  onProcessOptimizations: () => void;
}

const AILearningInsightsPanel: React.FC<AILearningInsightsPanelProps> = ({
  leadId,
  insights,
  optimizationQueue,
  isLearning,
  onProcessOptimizations
}) => {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'urgent': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'positive': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'opportunity': return <TrendingUp className="w-4 h-4 text-blue-500" />;
      default: return <Brain className="w-4 h-4 text-purple-500" />;
    }
  };

  const effectivenessScore = insights?.effectivenessScore || 0;

  return (
    <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
      {/* AI Learning Status */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-600" />
            AI Learning Status
            {isLearning && (
              <Badge variant="outline" className="bg-purple-100 text-purple-700 animate-pulse">
                <Sparkles className="h-3 w-3 mr-1" />
                Active
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Message Effectiveness Score */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-600">Message Effectiveness</span>
              <span className="text-xs font-bold text-purple-600">{effectivenessScore}%</span>
            </div>
            <Progress value={effectivenessScore} className="h-2" />
          </div>

          {/* Learning Insights */}
          {insights?.recommendations && insights.recommendations.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-600 mb-2">AI Recommendations</div>
              <div className="space-y-1">
                {insights.recommendations.slice(0, 2).map((rec: string, index: number) => (
                  <div key={index} className="text-xs p-2 bg-purple-100 rounded text-purple-700">
                    <Target className="w-3 h-3 inline mr-1" />
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optimization Queue */}
          {optimizationQueue.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600">Active Optimizations</span>
                <Badge variant="secondary" className="text-xs">
                  {optimizationQueue.length}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={onProcessOptimizations}
                className="w-full text-xs"
              >
                <Zap className="w-3 h-3 mr-1" />
                Process Queue
              </Button>
            </div>
          )}

          {/* Historical Feedback */}
          {insights?.historicalFeedback && insights.historicalFeedback.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-600 mb-2">Recent Feedback</div>
              <div className="space-y-1">
                {insights.historicalFeedback.slice(0, 3).map((feedback: any, index: number) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    {feedback.feedback_type === 'positive' ? (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    ) : feedback.feedback_type === 'negative' ? (
                      <AlertCircle className="w-3 h-3 text-red-500" />
                    ) : (
                      <Clock className="w-3 h-3 text-gray-500" />
                    )}
                    <span className="capitalize">{feedback.feedback_type}</span>
                    {feedback.rating && (
                      <Badge variant="outline" className="text-xs">
                        {feedback.rating}/5
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Learning Stats */}
          <div className="pt-2 border-t border-purple-200">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <BarChart3 className="w-3 h-3" />
              AI Learning • Lead #{leadId.slice(-6)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AILearningInsightsPanel;
