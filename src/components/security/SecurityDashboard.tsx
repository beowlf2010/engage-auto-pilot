import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Shield, Eye, Activity, Users, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SecurityEvent {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  details: any;
  created_at: string;
}

interface SecurityMetrics {
  totalEvents: number;
  criticalEvents: number;
  failedLogins: number;
  suspiciousActivity: number;
  recentEvents: SecurityEvent[];
}

const SecurityDashboard = () => {
  const { isAdmin } = useUserPermissions();
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');

  useEffect(() => {
    if (isAdmin) {
      loadSecurityMetrics();
      // Set up real-time monitoring
      const interval = setInterval(loadSecurityMetrics, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isAdmin, selectedTimeframe]);

  const loadSecurityMetrics = async () => {
    try {
      const timeframeHours = selectedTimeframe === '24h' ? 24 : selectedTimeframe === '7d' ? 168 : 720;
      const since = new Date(Date.now() - (timeframeHours * 60 * 60 * 1000)).toISOString();

      // Get security events
      const { data: events, error: eventsError } = await supabase
        .from('security_audit_log')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(100);

      if (eventsError) throw eventsError;

      // Calculate metrics
      const totalEvents = events?.length || 0;
      const criticalEvents = events?.filter(e => 
        e.action.includes('unauthorized') || 
        e.action.includes('failed_login') ||
        e.action.includes('rate_limit_exceeded')
      ).length || 0;

      const failedLogins = events?.filter(e => e.action === 'failed_login_attempt').length || 0;
      
      const suspiciousActivity = events?.filter(e => 
        e.action.includes('xss_attempt') ||
        e.action.includes('unauthorized') ||
        e.action.includes('invalid_input')
      ).length || 0;

      setMetrics({
        totalEvents,
        criticalEvents,
        failedLogins,
        suspiciousActivity,
        recentEvents: events?.slice(0, 20) || []
      });

      // Check for critical alerts
      if (criticalEvents > 10) {
        toast({
          title: "High Security Alert",
          description: `${criticalEvents} critical security events detected in the last ${selectedTimeframe}`,
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Error loading security metrics:', error);
      toast({
        title: "Error",
        description: "Failed to load security metrics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSecurityResponse = async (action: string, details: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('security-response', {
        body: { action, ...details }
      });

      if (error) throw error;

      toast({
        title: "Security Action Executed",
        description: data.message || "Security response action completed",
      });

      // Reload metrics
      loadSecurityMetrics();
    } catch (error) {
      console.error('Security response error:', error);
      toast({
        title: "Security Action Failed",
        description: error.message || "Failed to execute security response",
        variant: "destructive"
      });
    }
  };

  const getSeverityColor = (action: string) => {
    if (action.includes('unauthorized') || action.includes('failed_login')) return 'destructive';
    if (action.includes('rate_limit') || action.includes('xss_attempt')) return 'destructive';
    if (action.includes('invalid_input')) return 'secondary';
    return 'default';
  };

  const formatEventDetails = (event: SecurityEvent) => {
    const details = event.details || {};
    return Object.entries(details)
      .filter(([key, value]) => key !== 'function' && value !== null)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(', ');
  };

  if (!isAdmin) {
    return (
      <Alert>
        <Lock className="h-4 w-4" />
        <AlertDescription>
          Access denied. Admin privileges required to view security dashboard.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Activity className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading security dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Dashboard</h1>
          <p className="text-muted-foreground">Monitor security events and respond to threats</p>
        </div>
        
        <div className="flex items-center space-x-2">
          {['24h', '7d', '30d'].map((timeframe) => (
            <Button
              key={timeframe}
              variant={selectedTimeframe === timeframe ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeframe(timeframe)}
            >
              {timeframe}
            </Button>
          ))}
        </div>
      </div>

      {/* Security Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalEvents || 0}</div>
            <p className="text-xs text-muted-foreground">Last {selectedTimeframe}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{metrics?.criticalEvents || 0}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.failedLogins || 0}</div>
            <p className="text-xs text-muted-foreground">Authentication failures</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspicious Activity</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.suspiciousActivity || 0}</div>
            <p className="text-xs text-muted-foreground">Potential threats</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events">Recent Events</TabsTrigger>
          <TabsTrigger value="response">Incident Response</TabsTrigger>
          <TabsTrigger value="analysis">Threat Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Events</CardTitle>
              <CardDescription>Real-time security event monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics?.recentEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Badge variant={getSeverityColor(event.action)}>
                          {event.action.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(event.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{formatEventDetails(event)}</p>
                      {event.user_id && (
                        <p className="text-xs text-muted-foreground mt-1">User: {event.user_id}</p>
                      )}
                    </div>
                  </div>
                ))}
                
                {!metrics?.recentEvents.length && (
                  <p className="text-center text-muted-foreground py-8">No security events in the selected timeframe</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="response" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Incident Response Actions</CardTitle>
              <CardDescription>Take immediate security response actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Button
                  variant="destructive"
                  onClick={() => handleSecurityResponse('emergency_lockdown', {
                    reason: 'Manual emergency lockdown from security dashboard'
                  })}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Emergency Lockdown
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => handleSecurityResponse('rate_limit_reset', {
                    reason: 'Manual rate limit reset from dashboard'
                  })}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Reset Rate Limits
                </Button>
              </div>
              
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Emergency actions will be logged and may affect system availability. Use with caution.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Threat Analysis</CardTitle>
              <CardDescription>Security pattern analysis and recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics?.criticalEvents > 5 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      High number of critical security events detected. Consider implementing additional security measures.
                    </AlertDescription>
                  </Alert>
                )}
                
                {metrics?.failedLogins > 10 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Multiple failed login attempts detected. Consider implementing account lockout policies.
                    </AlertDescription>
                  </Alert>
                )}
                
                {metrics?.suspiciousActivity > 3 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Suspicious activity patterns detected. Review input validation and access controls.
                    </AlertDescription>
                  </Alert>
                )}
                
                {!metrics?.criticalEvents && !metrics?.failedLogins && !metrics?.suspiciousActivity && (
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      No significant security threats detected. System security appears normal.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SecurityDashboard;