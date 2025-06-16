
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Package, DollarSign, Brain, AlertTriangle } from 'lucide-react';
import { usePredictiveAnalytics } from '@/hooks/usePredictiveAnalytics';
import { useRealtimePredictiveUpdates } from '@/hooks/useRealtimePredictiveUpdates';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorBoundary from '@/components/ErrorBoundary';

const PredictiveAnalyticsOverview = () => {
  const { salesForecasts, inventoryDemandPredictions, marketIntelligence, isLoading, error, refresh } = usePredictiveAnalytics();

  // Set up real-time updates
  useRealtimePredictiveUpdates({
    onSalesForecastUpdate: refresh,
    onInventoryDemandUpdate: refresh,
    onMarketIntelligenceUpdate: refresh
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <LoadingSpinner text="Loading predictive analytics..." />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-64 space-y-4">
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <p className="text-sm text-gray-600">{error}</p>
          <button 
            onClick={refresh}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  const currentForecast = salesForecasts[0];
  const highDemandInventory = inventoryDemandPredictions.filter(p => p.demandScore > 70);
  const currentIntelligence = marketIntelligence[0];

  return (
    <ErrorBoundary>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Forecast</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${currentForecast ? (currentForecast.predictedRevenue / 1000).toFixed(0) : 0}K
            </div>
            {currentForecast && (
              <p className="text-xs text-muted-foreground">
                {(currentForecast.confidenceScore * 100).toFixed(0)}% confidence
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Demand Vehicles</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{highDemandInventory.length}</div>
            <p className="text-xs text-muted-foreground">
              Demand score &gt; 70
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Market Trend</CardTitle>
            {currentIntelligence?.demandTrend === 'increasing' ? 
              <TrendingUp className="h-4 w-4 text-green-500" /> : 
              <TrendingDown className="h-4 w-4 text-red-500" />
            }
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {currentIntelligence?.demandTrend || 'Stable'}
            </div>
            <p className="text-xs text-muted-foreground">
              Overall demand trend
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Insights</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentIntelligence?.recommendations?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active recommendations
            </p>
          </CardContent>
        </Card>
      </div>

      {currentIntelligence?.recommendations && currentIntelligence.recommendations.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Latest AI Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {currentIntelligence.recommendations.slice(0, 3).map((recommendation, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <Badge variant="outline" className="mt-1">
                    {index + 1}
                  </Badge>
                  <p className="text-sm">{recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </ErrorBoundary>
  );
};

export default PredictiveAnalyticsOverview;
