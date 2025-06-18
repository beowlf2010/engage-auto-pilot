
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Shield, AlertTriangle, CheckCircle, BookOpen, BarChart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getQualityScoreColor = (score: number) => {
    if (score >= 8.0) return 'text-green-600';
    if (score >= 7.0) return 'text-blue-600';
    if (score >= 6.0) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getComplianceColor = (violations: number) => {
    if (violations === 0) return 'text-green-600';
    if (violations <= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {/* Average Quality Score */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getQualityScoreColor(metrics.avgQualityScore)}`}>
            {metrics.avgQualityScore}/10
          </div>
          <p className="text-xs text-muted-foreground">
            Average quality rating
          </p>
        </CardContent>
      </Card>

      {/* Messages Reviewed */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Reviewed</CardTitle>
          <BarChart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{metrics.messagesReviewed}</div>
          <p className="text-xs text-muted-foreground">
            Messages analyzed
          </p>
        </CardContent>
      </Card>

      {/* Auto-Approval Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Auto-Approved</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{metrics.autoApprovalRate}%</div>
          <p className="text-xs text-muted-foreground">
            Automatic approval rate
          </p>
        </CardContent>
      </Card>

      {/* Compliance Violations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Violations</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getComplianceColor(metrics.complianceViolations)}`}>
            {metrics.complianceViolations}
          </div>
          <div className="flex items-center space-x-1 mt-1">
            {metrics.complianceViolations === 0 ? (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                Clean
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-xs">
                Review Required
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Training Recommendations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Training</CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{metrics.trainingRecommendations}</div>
          <p className="text-xs text-muted-foreground">
            Pending recommendations
          </p>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">System Health</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">98%</div>
          <div className="flex items-center space-x-1 mt-1">
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
              Operational
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QualityMetricsCards;
