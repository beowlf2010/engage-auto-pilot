
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, TrendingUp, Target, Lightbulb, BarChart3, Zap, RefreshCw } from 'lucide-react';
import { enhancedRealtimeLearningService } from '@/services/enhancedRealtimeLearningService';
import { useEnhancedAILearning } from '@/hooks/useEnhancedAILearning';

interface AILearningDashboardProps {
  leadId?: string;
  compact?: boolean;
}

const AILearningDashboard: React.FC<AILearningDashboardProps> = ({
  leadId,
  compact = false
}) => {
  const { insights, metrics, loading, error, refresh } = useEnhancedAILearning(leadId);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    // Initialize the enhanced learning service
    const initializeService = async () => {
      try {
        setInitializing(true);
        await enhancedRealtimeLearningService.initialize();
      } catch (error) {
        console.error('Failed to initialize learning service:', error);
      } finally {
        setInitializing(false);
      }
    };

    initializeService();
  }, []);

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

  const handleRefresh = async () => {
    await refresh();
  };

  if (loading || initializing) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Brain className="w-8 h-8 mx-auto mb-2 animate-pulse text-blue-600" />
          <p className="text-sm text-muted-foreground">
            {initializing ? 'Initializing AI learning system...' : 'Loading AI insights...'}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-red-600 mb-2">⚠️ Error loading AI data</div>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="space-y-3">
        {/* Quick Metrics */}
        <div className="grid grid-cols-2 gap-2">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <div>
                <div className="text-lg font-semibold">{metrics?.highImpact || 0}</div>
                <div className="text-xs text-muted-foreground">High Impact</div>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              <div>
                <div className="text-lg font-semibold">{metrics?.actionable || 0}</div>
                <div className="text-xs text-muted-foreground">Actionable</div>
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
                  <span className="text-xs font-medium">{insight.insight_title}</span>
                  <Badge variant="outline" className={`text-xs ${getImpactColor(insight.impact_level)}`}>
                    {insight.impact_level}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{insight.insight_description}</p>
              </div>
              <div className={`text-xs font-medium ${getConfidenceLevel(insight.confidence_score).color}`}>
                {Math.round(insight.confidence_score * 100)}%
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
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="w-4 h-4 mr-1" />
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
                <div className="text-2xl font-bold">{metrics?.totalInsights || 0}</div>
                <div className="text-sm text-muted-foreground">Total Insights</div>
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
                <div className="text-2xl font-bold">{metrics?.highImpact || 0}</div>
                <div className="text-sm text-muted-foreground">High Impact</div>
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
                <div className="text-2xl font-bold">{metrics?.actionable || 0}</div>
                <div className="text-sm text-muted-foreground">Actionable</div>
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
                <div className="text-2xl font-bold">
                  {insights.filter(i => i.actionable && !i.implemented).length}
                </div>
                <div className="text-sm text-muted-foreground">Ready to Apply</div>
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
            AI Learning Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insights.length === 0 ? (
            <div className="text-center py-8">
              <Brain className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium text-gray-900 mb-2">AI Learning Active</p>
              <p className="text-sm text-gray-600 mb-4">
                The AI is learning from your interactions. Use the Smart Inbox to generate more insights!
              </p>
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Check for New Insights
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {insights.map((insight: any, index: number) => (
                <div key={index} className="border rounded p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getImpactColor(insight.impact_level)}>
                        {insight.impact_level.toUpperCase()}
                      </Badge>
                      <Badge variant="secondary">
                        {insight.insight_type}
                      </Badge>
                      <span className={`text-sm font-medium ${getConfidenceLevel(insight.confidence_score).color}`}>
                        {getConfidenceLevel(insight.confidence_score).label} Confidence ({Math.round(insight.confidence_score * 100)}%)
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {insight.actionable && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Actionable
                        </Badge>
                      )}
                      {insight.applies_globally && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Global
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <h4 className="font-medium mb-1">{insight.insight_title}</h4>
                  <p className="text-sm text-muted-foreground mb-2">{insight.insight_description}</p>
                  
                  {insight.insight_data && Object.keys(insight.insight_data).length > 0 && (
                    <div className="bg-muted p-2 rounded text-xs mt-2">
                      <strong>Data:</strong>
                      <div className="mt-1">
                        {Object.entries(insight.insight_data).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span>{key.replace(/_/g, ' ')}:</span>
                            <span className="font-mono">
                              {typeof value === 'number' ? 
                                (value < 1 ? (value * 100).toFixed(1) + '%' : value.toFixed(2)) : 
                                String(value)
                              }
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
