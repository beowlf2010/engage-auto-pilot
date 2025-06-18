
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Brain, TrendingUp, MessageSquare, Target, Award, AlertTriangle, Lightbulb } from 'lucide-react';
import { aiLearningService } from '@/services/aiLearningService';

const AILearningDashboard = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'quarter'>('month');
  const [loading, setLoading] = useState(true);
  const [successfulPatterns, setSuccessfulPatterns] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [timeframe]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [metricsData, patternsData] = await Promise.all([
        aiLearningService.getPerformanceMetrics(timeframe),
        aiLearningService.getSuccessfulPatterns(5)
      ]);
      
      setMetrics(metricsData);
      setSuccessfulPatterns(patternsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateFeedbackStats = () => {
    if (!metrics?.feedback?.length) return { positive: 0, negative: 0, neutral: 0, avgRating: 0 };
    
    const stats = metrics.feedback.reduce((acc: any, item: any) => {
      acc[item.feedback_type] = (acc[item.feedback_type] || 0) + 1;
      if (item.rating) {
        acc.totalRating += item.rating;
        acc.ratingCount++;
      }
      return acc;
    }, { positive: 0, negative: 0, neutral: 0, totalRating: 0, ratingCount: 0 });
    
    stats.avgRating = stats.ratingCount > 0 ? (stats.totalRating / stats.ratingCount).toFixed(1) : 0;
    return stats;
  };

  const calculateOutcomeStats = () => {
    if (!metrics?.outcomes?.length) return {};
    
    return metrics.outcomes.reduce((acc: any, item: any) => {
      acc[item.outcome_type] = (acc[item.outcome_type] || 0) + 1;
      return acc;
    }, {});
  };

  const feedbackStats = calculateFeedbackStats();
  const outcomeStats = calculateOutcomeStats();

  const feedbackChartData = [
    { name: 'Positive', value: feedbackStats.positive, color: '#10b981' },
    { name: 'Neutral', value: feedbackStats.neutral, color: '#f59e0b' },
    { name: 'Negative', value: feedbackStats.negative, color: '#ef4444' }
  ];

  const outcomeChartData = Object.entries(outcomeStats).map(([key, value]) => ({
    name: key.replace('_', ' ').toUpperCase(),
    value
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Brain className="h-12 w-12 mx-auto mb-4 animate-pulse text-blue-600" />
          <p>Loading AI Learning Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-blue-600" />
            AI Learning Dashboard
          </h2>
          <p className="text-muted-foreground">Monitor AI performance and learning progress</p>
        </div>

        <Select value={timeframe} onValueChange={(value: 'week' | 'month' | 'quarter') => setTimeframe(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Last Week</SelectItem>
            <SelectItem value="month">Last Month</SelectItem>
            <SelectItem value="quarter">Last Quarter</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
                <p className="text-2xl font-bold">{feedbackStats.avgRating}/5</p>
              </div>
              <Award className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Messages Analyzed</p>
                <p className="text-2xl font-bold">{metrics?.feedback?.length || 0}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Successful Outcomes</p>
                <p className="text-2xl font-bold">{outcomeStats.appointment_booked + outcomeStats.test_drive_scheduled + outcomeStats.sale_completed || 0}</p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Learning Patterns</p>
                <p className="text-2xl font-bold">{successfulPatterns.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feedback Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Feedback Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={feedbackChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  dataKey="value"
                >
                  {feedbackChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Outcome Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Learning Outcomes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={outcomeChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Successful Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Top Performing Conversation Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {successfulPatterns.length > 0 ? (
              successfulPatterns.map((pattern, index) => (
                <div key={pattern.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <h4 className="font-medium">{pattern.pattern_name}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{pattern.pattern_description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      {(pattern.success_rate * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {pattern.successful_outcomes}/{pattern.total_attempts} success
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No conversation patterns learned yet</p>
                <p className="text-sm">Patterns will appear as the AI learns from successful conversations</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Message Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics?.topTemplates?.length > 0 ? (
              metrics.topTemplates.map((template: any, index: number) => (
                <div key={template.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">#{index + 1}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {template.template_content.substring(0, 60)}...
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Response Rate: </span>
                      <span className="font-medium">{(template.response_rate * 100).toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Used: </span>
                      <span className="font-medium">{template.usage_count} times</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No template performance data available yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AILearningDashboard;
