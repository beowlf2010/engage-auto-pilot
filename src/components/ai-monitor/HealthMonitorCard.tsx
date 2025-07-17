import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle, Activity } from 'lucide-react';

interface HealthMonitorCardProps {
  health: {
    healthScore: number;
    stuckRuns: number;
    failedLastHour: number;
    successRate24h: number;
    needsAttention: boolean;
    recommendations: string[];
  };
}

const HealthMonitorCard: React.FC<HealthMonitorCardProps> = ({ health }) => {
  const getHealthIcon = () => {
    if (health.healthScore >= 90) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (health.healthScore >= 70) return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getHealthColor = () => {
    if (health.healthScore >= 90) return 'text-green-500';
    if (health.healthScore >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getHealthBadge = () => {
    if (health.healthScore >= 90) return <Badge variant="default" className="bg-green-100 text-green-800">Healthy</Badge>;
    if (health.healthScore >= 70) return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Warning</Badge>;
    return <Badge variant="destructive">Critical</Badge>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" />
          System Health
        </CardTitle>
        {getHealthBadge()}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Health Score */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getHealthIcon()}
              <span className="text-sm font-medium">Health Score</span>
            </div>
            <span className={`text-2xl font-bold ${getHealthColor()}`}>
              {health.healthScore}%
            </span>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Stuck Processes</p>
              <p className={`text-lg font-semibold ${health.stuckRuns > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {health.stuckRuns}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Failed (1h)</p>
              <p className={`text-lg font-semibold ${health.failedLastHour > 3 ? 'text-red-500' : 'text-green-500'}`}>
                {health.failedLastHour}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Success Rate (24h)</p>
              <p className={`text-lg font-semibold ${health.successRate24h < 80 ? 'text-red-500' : 'text-green-500'}`}>
                {health.successRate24h.toFixed(1)}%
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Status</p>
              <p className={`text-sm font-medium ${health.needsAttention ? 'text-red-500' : 'text-green-500'}`}>
                {health.needsAttention ? 'Needs Attention' : 'Operating Normal'}
              </p>
            </div>
          </div>

          {/* Recommendations */}
          {health.recommendations.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Recommendations:</p>
              <div className="space-y-1">
                {health.recommendations.slice(0, 3).map((rec, index) => (
                  <p key={index} className="text-xs text-muted-foreground">
                    • {rec}
                  </p>
                ))}
                {health.recommendations.length > 3 && (
                  <p className="text-xs text-muted-foreground italic">
                    +{health.recommendations.length - 3} more recommendations
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default HealthMonitorCard;