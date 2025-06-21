import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, TrendingUp, MessageSquare, Target, Users, Clock, RefreshCw, Database } from 'lucide-react';
import { useAIPerformanceMetrics } from '@/hooks/useAILearning';
import { useLearningBackfill } from '@/hooks/useLearningBackfill';
import LearningAnalyticsSummary from './LearningAnalyticsSummary';

const AILearningDashboard = () => {
  const { metrics, loading, refresh } = useAIPerformanceMetrics('week');
  const { isBackfilling, backfillProgress, startBackfill } = useLearningBackfill();

  const totalFeedback = metrics?.feedback?.length || 0;
  const positiveFeedback = metrics?.feedback?.filter((f: any) => f.feedback_type === 'positive').length || 0;
  const negativeFeedback = metrics?.feedback?.filter((f: any) => f.feedback_type === 'negative').length || 0;
  const successRate = totalFeedback > 0 ? (positiveFeedback / totalFeedback) * 100 : 0;

  const totalOutcomes = metrics?.outcomes?.length || 0;
  const successfulOutcomes = metrics?.outcomes?.filter((o: any) => 
    ['appointment_booked', 'test_drive_scheduled', 'sale_completed', 'positive_response'].includes(o.outcome_type)
  ).length || 0;
  const conversionRate = totalOutcomes > 0 ? (successfulOutcomes / totalOutcomes) * 100 : 0;

  const templateCount = metrics?.topTemplates?.length || 0;
  const avgPerformanceScore = templateCount > 0 
    ? metrics.topTemplates.reduce((sum: number, t: any) => sum + (t.performance_score || 0), 0) / templateCount 
    : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Brain className="w-12 h-12 mx-auto mb-4 animate-pulse text-blue-600" />
          <h3 className="text-lg font-medium mb-2">Loading AI Learning Analytics</h3>
          <p className="text-gray-600">Analyzing conversation patterns and performance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-blue-600" />
            AI Learning Dashboard
          </h2>
          <p className="text-gray-600 mt-1">Monitor AI performance and learning insights</p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => startBackfill(200)}
            disabled={isBackfilling}
            className="flex items-center gap-2"
          >
            <Database className="w-4 h-4" />
            {isBackfilling ? 'Backfilling...' : 'Backfill Learning Data'}
          </Button>
          <Button 
            variant="outline" 
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Backfill Progress */}
      {isBackfilling && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-blue-600 animate-pulse" />
              <div className="flex-1">
                <p className="font-medium text-blue-900">Backfilling Historical Learning Data</p>
                <p className="text-sm text-blue-700">Processing existing conversations to build learning insights...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Backfill Results */}
      {backfillProgress && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Backfill Complete</p>
                <p className="text-sm text-green-700">
                  Processed {backfillProgress.processed} messages, found {backfillProgress.responses} responses
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Learning Status */}
      {totalFeedback === 0 && totalOutcomes === 0 && !isBackfilling && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-6 text-center">
            <Brain className="w-12 h-12 mx-auto mb-4 text-yellow-600" />
            <h3 className="font-semibold text-yellow-900 mb-2">No Learning Data Available</h3>
            <p className="text-yellow-800 mb-4">
              Click "Backfill Learning Data" to process your existing conversations and build AI learning insights.
            </p>
            <Button 
              onClick={() => startBackfill(200)}
              disabled={isBackfilling}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              <Database className="w-4 h-4 mr-2" />
              Start Learning Data Collection
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Learning Metrics Grid */}
      {(totalFeedback > 0 || totalOutcomes > 0) && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{successRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  {positiveFeedback} positive of {totalFeedback} total
                </p>
                <Progress value={successRate} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{conversionRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  {successfulOutcomes} conversions of {totalOutcomes} outcomes
                </p>
                <Progress value={conversionRate} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Template Performance</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(avgPerformanceScore * 100).toFixed(0)}%</div>
                <p className="text-xs text-muted-foreground">
                  {templateCount} templates analyzed
                </p>
                <Progress value={avgPerformanceScore * 100} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Learning Status</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Active</div>
                <p className="text-xs text-muted-foreground">
                  Collecting insights from conversations
                </p>
                <Badge variant="secondary" className="mt-2">
                  <Clock className="w-3 h-3 mr-1" />
                  Real-time Learning
                </Badge>
              </CardContent>
            </Card>
          </div>

          <LearningAnalyticsSummary />
        </>
      )}
    </div>
  );
};

export default AILearningDashboard;
