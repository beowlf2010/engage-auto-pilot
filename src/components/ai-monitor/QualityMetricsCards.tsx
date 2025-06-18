
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Activity, Shield, CheckCircle, AlertTriangle } from 'lucide-react';

interface QualityMetrics {
  totalQualityScores: number;
  avgQualityScore: number;
  complianceViolations: number;
  trainingRecommendations: number;
  messagesReviewed: number;
  autoApprovalRate: number;
}

interface QualityMetricsCardsProps {
  metrics: QualityMetrics;
  loading: boolean;
}

const QualityMetricsCards = ({ metrics, loading }: QualityMetricsCardsProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getQualityStatus = () => {
    if (metrics.avgQualityScore >= 8.0) return { color: 'text-green-600', trend: 'up', label: 'Excellent' };
    if (metrics.avgQualityScore >= 7.0) return { color: 'text-blue-600', trend: 'stable', label: 'Good' };
    if (metrics.avgQualityScore >= 6.0) return { color: 'text-yellow-600', trend: 'down', label: 'Fair' };
    return { color: 'text-red-600', trend: 'down', label: 'Poor' };
  };

  const qualityStatus = getQualityStatus();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Overall Quality Score */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Quality Score</CardTitle>
          {qualityStatus.trend === 'up' ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : qualityStatus.trend === 'down' ? (
            <TrendingDown className="h-4 w-4 text-red-600" />
          ) : (
            <Activity className="h-4 w-4 text-blue-600" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${qualityStatus.color}`}>
            {metrics.avgQualityScore.toFixed(1)}/10
          </div>
          <div className="mt-2">
            <Progress value={metrics.avgQualityScore * 10} className="h-2" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            <Badge variant={qualityStatus.label === 'Excellent' ? 'default' : 'secondary'}>
              {qualityStatus.label}
            </Badge>
          </p>
        </CardContent>
      </Card>

      {/* Messages Reviewed */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Messages Reviewed</CardTitle>
          <CheckCircle className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.messagesReviewed}</div>
          <p className="text-xs text-muted-foreground">
            Quality assessed messages
          </p>
          <div className="mt-2">
            <div className="text-sm font-medium text-green-600">
              {metrics.autoApprovalRate}% Auto-approved
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Status */}
      <Card className={metrics.complianceViolations > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Compliance Status</CardTitle>
          {metrics.complianceViolations > 0 ? (
            <AlertTriangle className="h-4 w-4 text-red-600" />
          ) : (
            <Shield className="h-4 w-4 text-green-600" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${metrics.complianceViolations > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {metrics.complianceViolations}
          </div>
          <p className="text-xs text-muted-foreground">
            {metrics.complianceViolations > 0 ? 'Open violations' : 'No violations'}
          </p>
          <div className="mt-2">
            <Badge variant={metrics.complianceViolations > 0 ? 'destructive' : 'default'}>
              {metrics.complianceViolations > 0 ? 'Action Required' : 'Compliant'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Training Recommendations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Training Items</CardTitle>
          <TrendingUp className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">
            {metrics.trainingRecommendations}
          </div>
          <p className="text-xs text-muted-foreground">
            Pending recommendations
          </p>
          <div className="mt-2">
            {metrics.trainingRecommendations > 0 ? (
              <Badge variant="secondary">Review Available</Badge>
            ) : (
              <Badge variant="outline">Up to Date</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QualityMetricsCards;
