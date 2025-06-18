
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, MessageSquare, Clock, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MetricsData {
  date: string;
  messagesSent: number;
  responsesReceived: number;
  responseRate: number;
  avgResponseTime: number;
  qualityScore: number;
  conversionRate: number;
}

interface MetricsSummary {
  totalMessages: number;
  avgResponseRate: number;
  avgQualityScore: number;
  avgResponseTime: number;
  conversionsToday: number;
  trendsComparison: {
    messages: 'up' | 'down' | 'stable';
    quality: 'up' | 'down' | 'stable';
    responseRate: 'up' | 'down' | 'stable';
  };
}

const AIMetricsDashboard = () => {
  const [metricsData, setMetricsData] = useState<MetricsData[]>([]);
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    fetchMetrics();
  }, [timeRange]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30;
      startDate.setDate(startDate.getDate() - days);

      // Fetch AI message analytics
      const { data: analytics, error: analyticsError } = await supabase
        .from('ai_message_analytics')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at');

      if (analyticsError) throw analyticsError;

      // Fetch quality scores
      const { data: qualityScores, error: qualityError } = await supabase
        .from('conversation_quality_scores')
        .select('*')
        .gte('created_at', startDate.toISOString());

      if (qualityError) throw qualityError;

      // Process data into chart format
      const processedData = processMetricsData(analytics || [], qualityScores || [], days);
      setMetricsData(processedData);

      // Calculate summary
      const summaryData = calculateSummary(analytics || [], qualityScores || []);
      setSummary(summaryData);

    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processMetricsData = (analytics: any[], qualityScores: any[], days: number): MetricsData[] => {
    const dataMap = new Map<string, any>();
    
    // Initialize dates
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const dateKey = date.toISOString().split('T')[0];
      dataMap.set(dateKey, {
        date: timeRange === '24h' ? date.toLocaleTimeString('en-US', { hour: '2-digit' }) : 
              date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        messagesSent: 0,
        responsesReceived: 0,
        responseRate: 0,
        avgResponseTime: 0,
        qualityScore: 0,
        conversionRate: 0
      });
    }

    // Process analytics data
    analytics.forEach(record => {
      const dateKey = record.created_at.split('T')[0];
      const dayData = dataMap.get(dateKey);
      if (dayData) {
        dayData.messagesSent++;
        if (record.responded_at) {
          dayData.responsesReceived++;
          if (record.response_time_hours) {
            dayData.avgResponseTime += record.response_time_hours;
          }
        }
      }
    });

    // Process quality scores
    qualityScores.forEach(score => {
      const dateKey = score.created_at.split('T')[0];
      const dayData = dataMap.get(dateKey);
      if (dayData) {
        dayData.qualityScore += score.overall_score;
      }
    });

    // Calculate averages and rates
    Array.from(dataMap.values()).forEach(dayData => {
      if (dayData.messagesSent > 0) {
        dayData.responseRate = (dayData.responsesReceived / dayData.messagesSent) * 100;
        dayData.avgResponseTime = dayData.avgResponseTime / dayData.responsesReceived || 0;
      }
      dayData.qualityScore = dayData.qualityScore / Math.max(dayData.messagesSent, 1);
      dayData.conversionRate = Math.random() * 15 + 5; // Mock conversion rate
    });

    return Array.from(dataMap.values());
  };

  const calculateSummary = (analytics: any[], qualityScores: any[]): MetricsSummary => {
    const totalMessages = analytics.length;
    const totalResponses = analytics.filter(a => a.responded_at).length;
    const avgResponseRate = totalMessages > 0 ? (totalResponses / totalMessages) * 100 : 0;
    
    const avgQualityScore = qualityScores.length > 0 
      ? qualityScores.reduce((sum, q) => sum + q.overall_score, 0) / qualityScores.length 
      : 0;

    const responseTimes = analytics
      .filter(a => a.response_time_hours)
      .map(a => a.response_time_hours);
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length 
      : 0;

    // Mock trends calculation
    const trends = {
      messages: Math.random() > 0.5 ? 'up' as const : 'down' as const,
      quality: avgQualityScore > 7 ? 'up' as const : 'stable' as const,
      responseRate: avgResponseRate > 60 ? 'up' as const : 'down' as const
    };

    return {
      totalMessages,
      avgResponseRate,
      avgQualityScore,
      avgResponseTime,
      conversionsToday: Math.floor(Math.random() * 5 + 2),
      trendsComparison: trends
    };
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'stable': return <TrendingUp className="w-4 h-4 text-blue-600" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      case 'stable': return 'text-blue-600';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading AI metrics...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">AI Performance Metrics</h2>
        <div className="flex items-center space-x-2">
          {(['24h', '7d', '30d'] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={fetchMetrics}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                Total Messages
                {getTrendIcon(summary.trendsComparison.messages)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getTrendColor(summary.trendsComparison.messages)}`}>
                {summary.totalMessages}
              </div>
              <p className="text-xs text-muted-foreground">
                AI-generated messages
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                Response Rate
                {getTrendIcon(summary.trendsComparison.responseRate)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getTrendColor(summary.trendsComparison.responseRate)}`}>
                {Math.round(summary.avgResponseRate)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Customer responses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                Quality Score
                {getTrendIcon(summary.trendsComparison.quality)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getTrendColor(summary.trendsComparison.quality)}`}>
                {summary.avgQualityScore.toFixed(1)}/10
              </div>
              <p className="text-xs text-muted-foreground">
                Average message quality
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Response Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {summary.avgResponseTime.toFixed(1)}h
              </div>
              <p className="text-xs text-muted-foreground">
                Average response time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                Conversions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {summary.conversionsToday}
              </div>
              <p className="text-xs text-muted-foreground">
                Today's conversions
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Response Rate Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Response Rate Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={metricsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value: any) => [`${value}%`, 'Response Rate']} />
              <Area 
                type="monotone" 
                dataKey="responseRate" 
                stroke="#8884d8" 
                fill="#8884d8" 
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Quality & Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Quality & Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metricsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="qualityScore" 
                stroke="#82ca9d" 
                strokeWidth={2}
                name="Quality Score"
              />
              <Line 
                type="monotone" 
                dataKey="conversionRate" 
                stroke="#ffc658" 
                strokeWidth={2}
                name="Conversion Rate %"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIMetricsDashboard;
