import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Package, DollarSign, Brain, AlertTriangle } from 'lucide-react';
import { usePredictiveAnalytics } from '@/hooks/usePredictiveAnalytics';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorBoundary from '@/components/ErrorBoundary';

const AIInsightsWidget = () => {
  const { insights, loading, lastUpdated, loadInsights } = usePredictiveAnalytics();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <LoadingSpinner text="Loading AI insights..." />
        </CardContent>
      </Card>
    );
  }

  // Extract different types of insights
  const conversionInsights = insights.filter(i => i.type === 'conversion_prediction');
  const churnInsights = insights.filter(i => i.type === 'churn_risk');

  return (
    <ErrorBoundary>
      <Card>
        <CardHeader>
          <CardTitle>AI Insights</CardTitle>
          {lastUpdated && (
            <p className="text-sm text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {conversionInsights.length > 0 && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">High Conversion Leads</p>
                <p className="text-2xl font-bold">{conversionInsights.length}</p>
              </div>
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>
          )}

          {churnInsights.length > 0 && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">At-Risk Leads</p>
                <p className="text-2xl font-bold">{churnInsights.length}</p>
              </div>
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
          )}

          {insights.length === 0 && (
            <div className="text-center py-4">
              <Brain className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
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
    </ErrorBoundary>
  );
};

export default AIInsightsWidget;
