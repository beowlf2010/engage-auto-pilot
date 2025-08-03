import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield, AlertTriangle, Activity, Users, Clock, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SecurityMetrics {
  daily_operations: number;
  emergency_rotations_month: number;
  hourly_operations: number;
  rate_limit_hits_today: number;
  suspicious_events_today: number;
  weekly_rotations: number;
}

interface SecurityEvent {
  id: string;
  action: string;
  resource_type: string;
  details: any;
  created_at: string;
  user_id?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const SecurityDashboard = () => {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>([]);
  const [alerts, setAlerts] = useState<SecurityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSecurityData();
    setupRealTimeSubscriptions();
  }, []);

  const loadSecurityData = async () => {
    try {
      // Load security metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from('security_dashboard_metrics')
        .select('*')
        .single();

      if (metricsError) throw metricsError;
      setMetrics(metricsData);

      // Load recent security events
      const { data: eventsData, error: eventsError } = await supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (eventsError) throw eventsError;
      
      const processedEvents = eventsData.map(event => ({
        ...event,
        severity: determineSeverity(event.action)
      }));

      setRecentEvents(processedEvents);
      setAlerts(processedEvents.filter(e => e.severity === 'critical' || e.severity === 'high'));
      
    } catch (error) {
      console.error('Error loading security data:', error);
      toast({
        title: "Error",
        description: "Failed to load security dashboard data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealTimeSubscriptions = () => {
    // Subscribe to security audit log changes
    const subscription = supabase
      .channel('security-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'security_audit_log'
        },
        (payload) => {
          const newEvent = {
            ...payload.new,
            severity: determineSeverity(payload.new.action)
          } as SecurityEvent;

          setRecentEvents(prev => [newEvent, ...prev.slice(0, 19)]);
          
          if (newEvent.severity === 'critical' || newEvent.severity === 'high') {
            setAlerts(prev => [newEvent, ...prev]);
            
            toast({
              title: "Security Alert",
              description: `${newEvent.action}: ${getEventDescription(newEvent)}`,
              variant: newEvent.severity === 'critical' ? "destructive" : "default"
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const determineSeverity = (action: string): 'low' | 'medium' | 'high' | 'critical' => {
    const criticalActions = ['account_locked', 'multiple_failed_logins', 'suspicious_activity_detected'];
    const highActions = ['failed_login_attempt', 'rate_limit_exceeded', 'unauthorized_access_attempt'];
    const mediumActions = ['api_key_rotated', 'settings_updated', 'password_changed'];
    
    if (criticalActions.includes(action)) return 'critical';
    if (highActions.includes(action)) return 'high';
    if (mediumActions.includes(action)) return 'medium';
    return 'low';
  };

  const getEventDescription = (event: SecurityEvent): string => {
    switch (event.action) {
      case 'failed_login_attempt':
        return `Failed login for ${event.details?.email || 'unknown user'}`;
      case 'account_locked':
        return `Account locked: ${event.details?.email || 'unknown user'}`;
      case 'rate_limit_exceeded':
        return `Rate limit exceeded for ${event.details?.endpoint || 'unknown endpoint'}`;
      case 'api_key_rotated':
        return `API key rotated: ${event.details?.key_type || 'unknown type'}`;
      default:
        return event.action.replace(/_/g, ' ');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Security Dashboard</h1>
        <Badge variant="outline" className="flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Live Monitoring
        </Badge>
      </div>

      {alerts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Security Alerts ({alerts.length})</AlertTitle>
          <AlertDescription>
            Critical security events detected. Review the events below for details.
          </AlertDescription>
        </Alert>
      )}

      {/* Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed Logins</p>
                <p className="text-2xl font-bold">{metrics?.suspicious_events_today || 0}</p>
              </div>
              <Ban className="w-8 h-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Lockouts</p>
                <p className="text-2xl font-bold">{metrics?.hourly_operations || 0}</p>
              </div>
              <Users className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rate Limits</p>
                <p className="text-2xl font-bold">{metrics?.rate_limit_hits_today || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Suspicious Activity</p>
                <p className="text-2xl font-bold">{metrics?.suspicious_events_today || 0}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">API Rotations</p>
                <p className="text-2xl font-bold">{metrics?.weekly_rotations || 0}</p>
              </div>
              <Shield className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Emergency Rotations</p>
                <p className="text-2xl font-bold">{metrics?.emergency_rotations_month || 0}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Security Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Security Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentEvents.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No recent security events</p>
            ) : (
              recentEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge className={getSeverityColor(event.severity)}>
                      {event.severity}
                    </Badge>
                    <div>
                      <p className="font-medium">{getEventDescription(event)}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">{event.resource_type}</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};