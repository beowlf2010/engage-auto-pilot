
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, TrendingUp, TrendingDown, Target, Lightbulb } from 'lucide-react';

interface LearningInsightsPanelProps {
  leadId: string;
  insights?: any;
  loading?: boolean;
}

const LearningInsightsPanel = ({ leadId, insights, loading }: LearningInsightsPanelProps) => {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 animate-pulse text-blue-600" />
            <span className="text-sm">AI is learning...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center text-sm text-muted-foreground">
            <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No learning data available yet</p>
            <p className="text-xs">AI will learn from message interactions</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getEffectivenessColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getEffectivenessIcon = (score: number) => {
    if (score >= 80) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (score >= 60) return <Target className="w-4 h-4 text-yellow-600" />;
    return <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="w-4 h-4 text-blue-600" />
          AI Learning Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        {/* Effectiveness Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Message Effectiveness</span>
            <div className="flex items-center gap-1">
              {getEffectivenessIcon(insights.effectivenessScore)}
              <span className={`text-xs font-medium ${getEffectivenessColor(insights.effectivenessScore)}`}>
                {insights.effectivenessScore.toFixed(1)}%
              </span>
            </div>
          </div>
          <Progress value={insights.effectivenessScore} className="h-2" />
        </div>

        {/* Sample Size */}
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Based on messages:</span>
          <Badge variant="secondary" className="text-xs">
            {insights.historicalFeedback?.length || 0}
          </Badge>
        </div>

        {/* Recommendations */}
        {insights.recommendations && insights.recommendations.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs font-medium">
              <Lightbulb className="w-3 h-3 text-amber-500" />
              AI Suggestions:
            </div>
            {insights.recommendations.slice(0, 2).map((rec: string, index: number) => (
              <div key={index} className="text-xs text-muted-foreground bg-amber-50 p-2 rounded">
                {rec}
              </div>
            ))}
          </div>
        )}

        {/* Learning Status */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Learning Status:</span>
            <Badge variant="outline" className="text-xs">
              {insights.historicalFeedback?.length > 5 ? 'Active Learning' : 'Collecting Data'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LearningInsightsPanel;
