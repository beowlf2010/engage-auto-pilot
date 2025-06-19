
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Package, DollarSign, Brain, AlertTriangle } from 'lucide-react';
import { usePredictiveAnalytics } from '@/hooks/usePredictiveAnalytics';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorBoundary from '@/components/ErrorBoundary';

const PredictiveAnalyticsOverview = () => {
  const { insights, loading, lastUpdated, loadInsights } = usePredictiveAnalytics();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <LoadingSpinner text="Loading predictive analytics..." />
        </CardContent>
      </Card>
    );
  }

  // Extract different types of insights
  const conversionInsights = insights.filter(i => i.type === 'conversion_probability');
  const churnInsights = insights.filter(i => i.type === 'churn_risk');
  const contentInsights = insights.filter(i => i.type === 'content_recommendation');
  const timingInsights = insights.filter(i => i.type === 'optimal_timing');

  // Calculate summary metrics from insights
  const highValueLeads = conversionInsights.filter(i => i.confidence > 0.7).length;
  const churnRiskLeads = churnInsights.filter(i => i.confidence > 0.6).length;
  const totalRecommendations = insights.reduce((total, insight) => total + insight.recommendedActions.length, 0);

  return (
    <ErrorBoundary>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High-Value Leads</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{highValueLeads}</div>
            <p className="text-xs text-muted-foreground">
              High conversion probability
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At-Risk Leads</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{churnRiskLeads}</div>
            <p className="text-xs text-muted-foreground">
              High churn risk detected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Insights</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.length}</div>
            <p className="text-xs text-muted-foreground">
              Active predictions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recommendations</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRecommendations}</div>
            <p className="text-xs text-muted-foreground">
              Actionable suggestions
            </p>
          </CardContent>
        </Card>
      </div>

      {insights.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Latest AI Insights</CardTitle>
            {lastUpdated && (
              <p className="text-sm text-muted-foreground">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.slice(0, 5).map((insight, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="capitalize">
                      {insight.type.replace('_', ' ')}
                    </Badge>
                    <Badge variant="secondary">
                      {(insight.confidence * 100).toFixed(0)}% confidence
                    </Badge>
                  </div>
                  
                  <p className="text-sm mb-2">{insight.expectedOutcome}</p>
                  
                  {insight.recommendedActions.length > 0 && (
                    <div className="mt-3">
                      <h5 className="text-xs font-medium text-muted-foreground mb-1">
                        Recommended Actions:
                      </h5>
                      <ul className="text-xs space-y-1">
                        {insight.recommendedActions.slice(0, 2).map((action, actionIndex) => (
                          <li key={actionIndex} className="flex items-center gap-1">
                            <span className="w-1 h-1 bg-blue-500 rounded-full" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {insights.length === 0 && (
              <div className="text-center py-8">
                <Brain className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No predictive insights available yet
                </p>
                <button 
                  onClick={loadInsights}
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                >
                  Generate Insights
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </ErrorBoundary>
  );
};

export default PredictiveAnalyticsOverview;
