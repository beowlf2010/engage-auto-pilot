import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSecurityMonitor, type ThreatDetection } from '@/hooks/useSecurityMonitor';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Shield, Eye, Activity, Bell, X } from 'lucide-react';

const SecurityAlerts = () => {
  const { isAdmin } = useUserPermissions();
  const { threats, summary } = useSecurityMonitor();
  const { toast } = useToast();
  const [dismissedThreats, setDismissedThreats] = useState<Set<string>>(new Set());
  const [alertsEnabled, setAlertsEnabled] = useState(true);

  // Show toast notifications for new threats
  useEffect(() => {
    if (!alertsEnabled || !isAdmin) return;

    const latestThreat = threats[0];
    if (latestThreat && latestThreat.severity === 'critical') {
      toast({
        title: "🚨 Critical Security Alert",
        description: latestThreat.description,
        variant: "destructive",
      });
    }
  }, [threats, alertsEnabled, isAdmin, toast]);

  const getSeverityColor = (severity: ThreatDetection['severity']) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'default';
    }
  };

  const getThreatIcon = (type: ThreatDetection['type']) => {
    switch (type) {
      case 'brute_force': return '🔓';
      case 'rate_limit_abuse': return '⚡';
      case 'xss_attack': return '💀';
      case 'suspicious_pattern': return '🕵️';
      default: return '⚠️';
    }
  };

  const dismissThreat = (threatId: string) => {
    setDismissedThreats(prev => new Set([...prev, threatId]));
  };

  const activeThreatIds = threats
    .map((threat, index) => `${threat.type}-${threat.timestamp}-${index}`)
    .filter(id => !dismissedThreats.has(id));

  const activeThreats = threats.filter((_, index) => 
    activeThreatIds.includes(`${threats[index].type}-${threats[index].timestamp}-${index}`)
  );

  if (!isAdmin) {
    return null;
  }

  if (activeThreats.length === 0) {
    return (
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-green-600" />
            <span className="text-green-800 font-medium">All Clear</span>
          </div>
          <p className="text-green-700 text-sm mt-1">No active security threats detected</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Alert Controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-destructive" />
          Security Alerts ({activeThreats.length})
        </h3>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAlertsEnabled(!alertsEnabled)}
          className="flex items-center space-x-2"
        >
          <Bell className={`h-4 w-4 ${alertsEnabled ? 'text-blue-600' : 'text-gray-400'}`} />
          <span>{alertsEnabled ? 'Alerts On' : 'Alerts Off'}</span>
        </Button>
      </div>

      {/* Summary Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{summary.activeThreats}</div>
              <div className="text-sm text-muted-foreground">Active Threats</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{summary.criticalThreats}</div>
              <div className="text-sm text-muted-foreground">Critical</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{summary.recentActivity}</div>
              <div className="text-sm text-muted-foreground">Recent Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{summary.topTargets.length}</div>
              <div className="text-sm text-muted-foreground">Top Targets</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Threats */}
      <div className="space-y-3">
        {activeThreats.slice(0, 10).map((threat, index) => {
          const threatId = `${threat.type}-${threat.timestamp}-${index}`;
          
          return (
            <Alert key={threatId} className="relative">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="text-2xl">{getThreatIcon(threat.type)}</div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant={getSeverityColor(threat.severity)}>
                        {threat.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {threat.type.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(threat.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <AlertDescription className="text-sm">
                      {threat.description}
                    </AlertDescription>
                    
                    {threat.metadata && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <details>
                          <summary className="cursor-pointer hover:text-foreground">
                            View Details
                          </summary>
                          <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                            {JSON.stringify(threat.metadata, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissThreat(threatId)}
                  className="p-1 h-auto"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Alert>
          );
        })}
      </div>

      {activeThreats.length > 10 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              {activeThreats.length - 10} more threats. View Security Dashboard for complete details.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SecurityAlerts;