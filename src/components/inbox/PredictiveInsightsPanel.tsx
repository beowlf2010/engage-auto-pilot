
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, X, Clock, Target, Zap } from 'lucide-react';

interface PredictiveInsightsPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  predictions: any[];
  insights: any;
}

const PredictiveInsightsPanel: React.FC<PredictiveInsightsPanelProps> = ({
  isOpen,
  onToggle,
  predictions,
  insights
}) => {
  if (!isOpen) return null;

  const topPredictions = predictions.slice(0, 5);
  const predictionScore = topPredictions.reduce((sum, p) => sum + (p.predictionScore || 0), 0);

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white border-l shadow-lg z-50 overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Predictive Insights</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onToggle}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* Performance Metrics */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-gray-600">Avg Load Time</div>
                  <div className="font-medium">{insights?.performanceMetrics?.avgLoadTime || '0ms'}</div>
                </div>
                <div>
                  <div className="text-gray-600">Active Jobs</div>
                  <div className="font-medium">{insights?.performanceMetrics?.activeJobs || 0}</div>
                </div>
                <div>
                  <div className="text-gray-600">Total Loaded</div>
                  <div className="font-medium">{insights?.performanceMetrics?.totalLoaded || 0}</div>
                </div>
                <div>
                  <div className="text-gray-600">Prediction Score</div>
                  <div className="font-medium text-green-600">{predictionScore.toFixed(1)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Predictions */}
          {topPredictions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Top Predictions</CardTitle>
                <CardDescription>Conversations likely to need attention</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {topPredictions.map((prediction, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium">Lead {prediction.leadId?.slice(-6) || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {prediction.predictionScore?.toFixed(1) || '0.0'}
                        </Badge>
                        {prediction.shouldPreload && (
                          <Zap className="h-3 w-3 text-yellow-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Queue Status */}
          {insights?.performanceMetrics?.queueStatus && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Queue Status
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {Object.entries(insights.performanceMetrics.queueStatus).map(([priority, count]) => (
                    <div key={priority} className="flex justify-between items-center">
                      <span className="text-sm capitalize">{priority}</span>
                      <Badge variant={priority === 'urgent' ? 'destructive' : 'secondary'}>
                        {count as number}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Enhanced Insights */}
          {insights?.enhanced && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-sm text-gray-600">
                  <p>Advanced ML predictions and patterns will appear here as they become available.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default PredictiveInsightsPanel;
