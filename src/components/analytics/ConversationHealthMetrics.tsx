
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Clock, 
  TrendingUp, 
  Users,
  BarChart3,
  CheckCircle
} from 'lucide-react';

interface ConversationHealthData {
  totalConversations: number;
  averageResponseTime: number;
  responseRate: number;
  engagementScore: number;
  conversionRate: number;
  activeConversations: number;
  healthScore: number;
  trends: {
    responseTime: 'up' | 'down' | 'stable';
    engagement: 'up' | 'down' | 'stable';
    conversion: 'up' | 'down' | 'stable';
  };
}

interface ConversationHealthMetricsProps {
  data: ConversationHealthData;
  className?: string;
}

const ConversationHealthMetrics: React.FC<ConversationHealthMetricsProps> = ({
  data,
  className = ''
}) => {
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'down': return <TrendingUp className="h-3 w-3 text-red-600 rotate-180" />;
      default: return <div className="h-3 w-3 bg-gray-400 rounded-full" />;
    }
  };

  const formatResponseTime = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${Math.round(hours / 24)}d`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Overall Health Score */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Conversation Health Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-3xl font-bold px-3 py-1 rounded ${getHealthColor(data.healthScore)}`}>
              {data.healthScore}
            </span>
            <Badge variant="outline" className={getHealthColor(data.healthScore)}>
              {data.healthScore >= 80 ? 'EXCELLENT' : 
               data.healthScore >= 60 ? 'GOOD' : 'NEEDS IMPROVEMENT'}
            </Badge>
          </div>
          <Progress value={data.healthScore} className="h-2" />
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              Active Conversations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">{data.activeConversations}</span>
              <span className="text-xs text-gray-500">of {data.totalConversations}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">{formatResponseTime(data.averageResponseTime)}</span>
              {getTrendIcon(data.trends.responseTime)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium flex items-center gap-1">
              <Users className="h-3 w-3" />
              Response Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">{data.responseRate}%</span>
              {getTrendIcon(data.trends.engagement)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">{data.conversionRate}%</span>
              {getTrendIcon(data.trends.conversion)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Performance Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Response Rate</span>
              <div className="flex items-center gap-2">
                <Progress value={data.responseRate} className="h-1 w-20" />
                <span className="w-12 text-right">{data.responseRate}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Engagement Quality</span>
              <div className="flex items-center gap-2">
                <Progress value={data.engagementScore} className="h-1 w-20" />
                <span className="w-12 text-right">{data.engagementScore}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Conversion Rate</span>
              <div className="flex items-center gap-2">
                <Progress value={data.conversionRate} className="h-1 w-20" />
                <span className="w-12 text-right">{data.conversionRate}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConversationHealthMetrics;
