import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, TrendingUp, Target, BarChart3, RefreshCw } from 'lucide-react';
import { useAggressiveCadenceLearning } from '@/hooks/useAggressiveCadenceLearning';

export const AggressiveCadenceMonitor: React.FC = () => {
  const { 
    insights, 
    performanceSummary, 
    loading, 
    error, 
    runAnalysis,
    refresh 
  } = useAggressiveCadenceLearning();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Aggressive Cadence Learning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading performance data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Aggressive Cadence Learning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Error loading data: {error}</p>
            <Button onClick={refresh} variant="outline" className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatTime = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  const getPriorityColor = (stage: string) => {
    if (stage.includes('1') || stage.includes('2') || stage.includes('3')) return 'destructive';
    if (stage.includes('4') || stage.includes('5')) return 'default';
    return 'secondary';
  };

  return (
    <div className="space-y-6">
      {/* Performance Summary */}
      {performanceSummary?.weekly && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Weekly Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{performanceSummary.weekly.totalSent}</div>
                <div className="text-sm text-muted-foreground">Messages Sent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{performanceSummary.weekly.totalResponses}</div>
                <div className="text-sm text-muted-foreground">Responses</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {(performanceSummary.weekly.responseRate * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Response Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {performanceSummary.weekly.avgResponseTime.toFixed(1)}h
                </div>
                <div className="text-sm text-muted-foreground">Avg Response Time</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timing Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Optimal Timing Insights
            </div>
            <Button onClick={runAnalysis} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Analyze
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insights.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No timing insights available yet. More data needed for analysis.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {insights.map((insight) => (
                <div key={insight.stage} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant={getPriorityColor(insight.stage)}>
                      {insight.stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                    <div>
                      <div className="font-medium">
                        Optimal: {formatTime(insight.optimalHour)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {insight.responseRate > 0 && (
                          <>Response Rate: {(insight.responseRate * 100).toFixed(1)}%</>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {insight.avgResponseTime > 0 
                          ? `${insight.avgResponseTime.toFixed(1)}h avg` 
                          : 'No data'
                        }
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {insight.sampleSize} samples • {(insight.confidence * 100).toFixed(0)}% confidence
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Performing Times */}
      {performanceSummary?.topPerformingTimes?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Performing Times
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {performanceSummary.topPerformingTimes.slice(0, 5).map((timing: any, index: number) => (
                <div key={`${timing.template_stage}-${timing.hour_of_day}-${timing.day_of_week}`} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">
                        {timing.template_stage.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatTime(timing.hour_of_day)} • Day {timing.day_of_week}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {(timing.response_rate * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {timing.total_sent} sent
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};