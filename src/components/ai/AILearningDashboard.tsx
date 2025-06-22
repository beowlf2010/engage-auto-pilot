
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, TrendingUp, Target, Lightbulb, BarChart3, Zap } from 'lucide-react';
import { realtimeLearningService } from '@/services/realtimeLearningService';
import { useAIPerformanceMetrics } from '@/hooks/useAILearning';

interface AILearningDashboardProps {
  leadId?: string;
  compact?: boolean;
}

const AILearningDashboard: React.FC<AILearningDashboardProps> = ({
  leadId,
  compact = false
}) => {
  const [learningData, setLearningData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { metrics, loading: metricsLoading } = useAIPerformanceMetrics('week');

  useEffect(() => {
    loadLearningData();
  }, [leadId]);

  const loadLearningData = async () => {
    setLoading(true);
    try {
      const data = await realtimeLearningService.getOptimizationInsights(leadId);
      setLearningData(data);
    } catch (error) {
      console.error('Error loading learning data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConfidenceLevel = (confidence: number) => {
    if (confidence >= 0.8) return { label: 'High', color: 'text-green-600' };
    if (confidence >= 0.6) return { label: 'Medium', color: 'text-yellow-600' };
    return { label: 'Low', color: 'text-red-600' };
  };

  if (loading || metricsLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Brain className="w-8 h-8 mx-auto mb-2 animate-pulse text-blue-600" />
          <p className="text-sm text-muted-foreground">Loading AI learning insights...</p>
        </CardContent>
      </Card>
    );
  }

  const todayMetrics = metrics?.feedback?.[0] || {};
  const insights = learningData?.insights || [];
  const activeOptimizations = learningData?.activeOptimizations || [];

  if (compact) {
    return (
      <div className="space-y-3">
        {/* Quick Metrics */}
        <div className="grid grid-cols-2 gap-2">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <div>
                <div className="text-lg font-semibold">{metrics?.feedback?.filter((f: any) => f.feedback_type === 'positive').length || 0}</div>
                <div className="text-xs text-muted-foreground">Positive Feedback</div>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              <div>
                <div className="text-lg font-semibold">{insights.length}</div>
                <div className="text-xs text-muted-foreground">Active Insights</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Top Insights */}
        {insights.slice(0, 2).map((insight: any, index: number) => (
          <Card key={index} className="p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Lightbulb className="w-3 h-3 text-yellow-600" />
                  <span className="text-xs font-medium">{insight.title}</span>
                  <Badge variant="outline" className={`text-xs ${getImpactColor(insight.impact)}`}>
                    {insight.impact}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{insight.description}</p>
              </div>
              <div className={`text-xs font-medium ${getConfidenceLevel(insight.confidence).color}`}>
                {Math.round(insight.confidence * 100)}%
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-blue-600" />
          <h2 className="text-lg font-semibold">AI Learning Dashboard</h2>
        </div>
        <Button variant="outline" size="sm" onClick={loadLearningData}>
          Refresh
        </Button>
      </div>

      {/* Learning Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded">
                <BarChart3 className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {metrics?.feedback?.length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Total Interactions</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {Math.round(((metrics?.feedback?.filter((f: any) => f.feedback_type === 'positive').length || 0) / (metrics?.feedback?.length || 1)) * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded">
                <Lightbulb className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{insights.length}</div>
                <div className="text-sm text-muted-foreground">Active Insights</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded">
                <Zap className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{activeOptimizations.length}</div>
                <div className="text-sm text-muted-foreground">Optimizations</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Learning Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-600" />
            Learning Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insights.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No learning insights available yet. Keep interacting to generate insights!
            </p>
          ) : (
            <div className="space-y-4">
              {insights.map((insight: any, index: number) => (
                <div key={index} className="border rounded p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getImpactColor(insight.impact)}>
                        {insight.impact.toUpperCase()}
                      </Badge>
                      <Badge variant="secondary">
                        {insight.type}
                      </Badge>
                      <span className={`text-sm font-medium ${getConfidenceLevel(insight.confidence).color}`}>
                        {getConfidenceLevel(insight.confidence).label} Confidence ({Math.round(insight.confidence * 100)}%)
                      </span>
                    </div>
                    {insight.actionable && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Actionable
                      </Badge>
                    )}
                  </div>
                  
                  <h4 className="font-medium mb-1">{insight.title}</h4>
                  <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
                  
                  {insight.data && Object.keys(insight.data).length > 0 && (
                    <div className="bg-muted p-2 rounded text-xs">
                      <strong>Data:</strong> {JSON.stringify(insight.data, null, 2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Template Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Template Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeOptimizations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No template performance data available yet.
            </p>
          ) : (
            <div className="space-y-3">
              {activeOptimizations.slice(0, 5).map((template: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex-1">
                    <div className="font-medium text-sm mb-1">
                      Template #{index + 1}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {template.template_content?.substring(0, 60)}...
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {Math.round((template.response_rate || 0) * 100)}% response
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Used {template.usage_count} times
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AILearningDashboard;
