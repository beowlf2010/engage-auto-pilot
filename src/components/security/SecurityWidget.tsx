import { useSecurityMonitor } from '@/hooks/useSecurityMonitor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, Shield, AlertTriangle, Eye } from 'lucide-react';

const SecurityWidget = () => {
  const { threats, summary } = useSecurityMonitor();

  const recentThreats = threats.slice(0, 3);
  const criticalThreatsPercent = summary.activeThreats > 0 
    ? (summary.criticalThreats / summary.activeThreats) * 100 
    : 0;

  const getStatusColor = () => {
    if (summary.criticalThreats > 0) return 'text-destructive';
    if (summary.activeThreats > 3) return 'text-orange-500';
    return 'text-green-600';
  };

  const getStatusText = () => {
    if (summary.criticalThreats > 0) return 'Critical Threats Detected';
    if (summary.activeThreats > 3) return 'Elevated Security Activity';
    return 'Security Status Normal';
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Security
          </CardTitle>
          <div className={`flex items-center space-x-1 ${getStatusColor()}`}>
            <Activity className="h-4 w-4" />
            <span className="text-sm font-medium">{getStatusText()}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Security Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{summary.activeThreats}</div>
            <div className="text-xs text-muted-foreground">Active Threats</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-destructive">{summary.criticalThreats}</div>
            <div className="text-xs text-muted-foreground">Critical</div>
          </div>
        </div>

        {/* Threat Level Indicator */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Threat Level</span>
            <span>{Math.round(criticalThreatsPercent)}%</span>
          </div>
          <Progress 
            value={criticalThreatsPercent} 
            className={`h-2 ${criticalThreatsPercent > 50 ? 'bg-red-100' : 'bg-green-100'}`}
          />
        </div>

        {/* Recent Threats */}
        {recentThreats.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center">
              <AlertTriangle className="h-4 w-4 mr-1" />
              Recent Threats
            </h4>
            <div className="space-y-2">
              {recentThreats.map((threat, index) => (
                <div key={`${threat.type}-${threat.timestamp}-${index}`} className="flex items-center justify-between p-2 bg-muted rounded-sm">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <Badge variant="destructive" className="text-xs">
                      {threat.severity}
                    </Badge>
                    <span className="text-sm truncate">
                      {threat.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(threat.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center">
            <Eye className="h-4 w-4 mr-1" />
            Recent Activity
          </span>
          <span className="font-medium">{summary.recentActivity} events</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default SecurityWidget;