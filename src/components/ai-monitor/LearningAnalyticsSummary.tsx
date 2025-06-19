
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, TrendingUp, MessageSquare, Target, Users, Clock } from 'lucide-react';
import { useAIPerformanceMetrics } from '@/hooks/useAILearning';

const LearningAnalyticsSummary = () => {
  const { metrics, loading } = useAIPerformanceMetrics('week');

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 animate-pulse text-blue-600" />
            <span>Loading learning analytics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">No learning analytics available</p>
        </CardContent>
      </Card>
    );
  }

  const totalFeedback = metrics.feedback?.length || 0;
  const positiveFeedback = metrics.feedback?.filter((f: any) => f.feedback_type === 'positive').length || 0;
  const successRate = totalFeedback > 0 ? (positiveFeedback / totalFeedback) * 100 : 0;

  const totalOutcomes = metrics.outcomes?.length || 0;
  const successfulOutcomes = metrics.outcomes?.filter((o: any) => 
    ['appointment_booked', 'test_drive_scheduled', 'sale_completed'].includes(o.outcome_type)
  ).length || 0;
  const conversionRate = totalOutcomes > 0 ? (successfulOutcomes / totalOutcomes) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-600" />
          AI Learning Summary (This Week)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totalFeedback}</div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <MessageSquare className="w-3 h-3" />
              Messages Analyzed
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{successRate.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Success Rate
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{totalOutcomes}</div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Target className="w-3 h-3" />
              Tracked Outcomes
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{conversionRate.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Users className="w-3 h-3" />
              Conversion Rate
            </div>
          </div>
        </div>

        {/* Progress Indicators */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Message Quality</span>
              <span className="text-muted-foreground">{successRate.toFixed(1)}%</span>
            </div>
            <Progress value={successRate} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Learning Progress</span>
              <span className="text-muted-foreground">{Math.min(totalFeedback * 2, 100).toFixed(0)}%</span>
            </div>
            <Progress value={Math.min(totalFeedback * 2, 100)} className="h-2" />
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant={totalFeedback > 10 ? "default" : "secondary"} className="text-xs">
            <Brain className="w-3 h-3 mr-1" />
            {totalFeedback > 10 ? 'Active Learning' : 'Collecting Data'}
          </Badge>
          
          {successRate > 70 && (
            <Badge variant="default" className="bg-green-600 text-xs">
              <TrendingUp className="w-3 h-3 mr-1" />
              High Performance
            </Badge>
          )}
          
          {totalOutcomes > 5 && (
            <Badge variant="outline" className="text-xs">
              <Target className="w-3 h-3 mr-1" />
              Good Sample Size
            </Badge>
          )}
        </div>

        {/* Learning Status */}
        <div className="text-xs text-muted-foreground border-t pt-3">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LearningAnalyticsSummary;
