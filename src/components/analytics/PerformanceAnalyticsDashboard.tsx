
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  MessageSquare, 
  Target, 
  Clock,
  Users,
  Zap,
  Trophy,
  BarChart3,
  CalendarDays,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { usePerformanceAnalytics, useTeamPerformance } from '@/hooks/usePerformanceAnalytics';

interface PerformanceAnalyticsDashboardProps {
  className?: string;
}

const PerformanceAnalyticsDashboard: React.FC<PerformanceAnalyticsDashboardProps> = ({
  className = ''
}) => {
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date()
  });
  
  const { metrics, isLoading: metricsLoading, refreshMetrics } = usePerformanceAnalytics(dateRange);
  const { teamMetrics, isLoading: teamLoading } = useTeamPerformance();

  const getPerformanceColor = (value: number, thresholds = { good: 70, fair: 40 }) => {
    if (value >= thresholds.good) return 'text-green-600 bg-green-50';
    if (value >= thresholds.fair) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const formatResponseTime = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${Math.round(hours / 24)}d`;
  };

  if (metricsLoading || teamLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">No performance data available</p>
          <Button onClick={refreshMetrics} className="mt-4">
            Refresh Data
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Analytics</h2>
          <p className="text-gray-600">AI effectiveness and team performance insights</p>
        </div>
        <Button onClick={refreshMetrics} variant="outline">
          <BarChart3 className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Total Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalMessages}</div>
            <div className="flex items-center text-sm text-gray-600">
              <ArrowUp className="h-3 w-3 text-green-600 mr-1" />
              +12% from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Response Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold px-2 py-1 rounded ${getPerformanceColor(metrics.responseRate)}`}>
              {metrics.responseRate.toFixed(1)}%
            </div>
            <Progress value={metrics.responseRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold px-2 py-1 rounded ${getPerformanceColor(metrics.conversionRate, { good: 15, fair: 8 })}`}>
              {metrics.conversionRate.toFixed(1)}%
            </div>
            <Progress value={metrics.conversionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Avg Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatResponseTime(metrics.averageResponseTime)}</div>
            <div className="flex items-center text-sm text-gray-600">
              <ArrowDown className="h-3 w-3 text-green-600 mr-1" />
              -15% faster
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Template Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Top Performing Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.templateEffectiveness.slice(0, 5).map((template, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-sm">{template.template}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                    <span>Used: {template.usageCount}x</span>
                    <span>Response: {template.responseRate.toFixed(1)}%</span>
                    <span>Conversion: {template.conversionRate.toFixed(1)}%</span>
                  </div>
                </div>
                <Badge className={getPerformanceColor(template.performanceScore)}>
                  {template.performanceScore.toFixed(1)}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Time-Based Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Performance by Time of Day
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.timeBasedPerformance.map((timeData) => (
              <div key={timeData.timeSlot} className="text-center p-3 border rounded-lg">
                <div className="font-medium">{timeData.timeSlot}</div>
                <div className="text-2xl font-bold mt-1">{timeData.messageCount}</div>
                <div className="text-sm text-gray-600">messages</div>
                <div className="text-sm mt-1">
                  {timeData.responseRate.toFixed(1)}% response
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lead Quality Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Lead Quality Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {metrics.leadQualityMetrics.highQualityLeads}
              </div>
              <div className="text-sm text-green-700">High Quality</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {metrics.leadQualityMetrics.mediumQualityLeads}
              </div>
              <div className="text-sm text-yellow-700">Medium Quality</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {metrics.leadQualityMetrics.lowQualityLeads}
              </div>
              <div className="text-sm text-red-700">Low Quality</div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-medium">Average Lead Score</span>
              <span className="text-lg font-bold text-blue-600">
                {metrics.leadQualityMetrics.avgLeadScore}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Performance Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {teamMetrics.slice(0, 5).map((member, index) => (
              <div key={member.salespersonId} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'bg-yellow-100 text-yellow-800' :
                    index === 1 ? 'bg-gray-100 text-gray-800' :
                    index === 2 ? 'bg-orange-100 text-orange-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <div className="text-sm text-gray-600">
                      {member.totalLeads} leads • {member.aiAssistedLeads} AI-assisted
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">{member.aiEffectivenessScore}</div>
                  <div className="text-sm text-gray-600">AI Score</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceAnalyticsDashboard;
