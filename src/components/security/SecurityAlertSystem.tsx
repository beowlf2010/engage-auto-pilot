import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Shield, Ban, CheckCircle, X } from "lucide-react";

interface SecurityAlert {
  id: string;
  action: string;
  resource_type: string;
  details: any;
  created_at: string;
  user_id?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  acknowledged: boolean;
}

interface ThreatResponse {
  threat_type: string;
  response_action: string;
  automated: boolean;
}

export const SecurityAlertSystem = () => {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoResponse, setAutoResponse] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadActiveAlerts();
    setupRealTimeAlerts();
  }, []);

  const loadActiveAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const processedAlerts = data
        .map(event => ({
          ...event,
          severity: determineSeverity(event.action),
          acknowledged: false
        }))
        .filter(alert => alert.severity === 'critical' || alert.severity === 'high');

      setAlerts(processedAlerts);
    } catch (error) {
      console.error('Error loading alerts:', error);
      toast({
        title: "Error",
        description: "Failed to load security alerts",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealTimeAlerts = () => {
    const subscription = supabase
      .channel('security-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'security_audit_log'
        },
        async (payload) => {
          const event = payload.new;
          const severity = determineSeverity(event.action);
          
          if (severity === 'critical' || severity === 'high') {
            const newAlert: SecurityAlert = {
              id: event.id,
              action: event.action,
              resource_type: event.resource_type,
              details: event.details,
              created_at: event.created_at,
              user_id: event.user_id,
              severity,
              acknowledged: false
            };

            setAlerts(prev => [newAlert, ...prev]);
            
            // Show immediate notification
            toast({
              title: severity === 'critical' ? "Critical Security Alert!" : "High Security Alert",
              description: getAlertDescription(newAlert),
              variant: severity === 'critical' ? "destructive" : "default"
            });

            // Trigger automated response if enabled
            if (autoResponse && severity === 'critical') {
              await triggerAutomatedResponse(newAlert);
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const determineSeverity = (action: string): 'low' | 'medium' | 'high' | 'critical' => {
    const criticalActions = [
      'account_locked', 
      'multiple_failed_logins', 
      'suspicious_activity_detected',
      'unauthorized_access_attempt',
      'sql_injection_detected',
      'brute_force_detected'
    ];
    
    const highActions = [
      'failed_login_attempt', 
      'rate_limit_exceeded', 
      'invalid_token_used',
      'permission_escalation_attempt'
    ];
    
    const mediumActions = [
      'api_key_rotated', 
      'settings_updated', 
      'password_changed',
      'suspicious_login_location'
    ];
    
    if (criticalActions.includes(action)) return 'critical';
    if (highActions.includes(action)) return 'high';
    if (mediumActions.includes(action)) return 'medium';
    return 'low';
  };

  const getAlertDescription = (alert: SecurityAlert): string => {
    switch (alert.action) {
      case 'multiple_failed_logins':
        return `Multiple failed login attempts detected for ${alert.details?.email || 'unknown user'}`;
      case 'account_locked':
        return `Account automatically locked: ${alert.details?.email || 'unknown user'}`;
      case 'rate_limit_exceeded':
        return `Rate limit exceeded for ${alert.details?.endpoint || 'unknown endpoint'}`;
      case 'unauthorized_access_attempt':
        return `Unauthorized access attempt detected from ${alert.details?.ip_address || 'unknown IP'}`;
      case 'suspicious_activity_detected':
        return `Suspicious activity pattern detected`;
      case 'brute_force_detected':
        return `Brute force attack detected`;
      case 'sql_injection_detected':
        return `SQL injection attempt detected`;
      default:
        return alert.action.replace(/_/g, ' ');
    }
  };

  const triggerAutomatedResponse = async (alert: SecurityAlert): Promise<ThreatResponse> => {
    const response: ThreatResponse = {
      threat_type: alert.action,
      response_action: 'none',
      automated: true
    };

    try {
      switch (alert.action) {
        case 'brute_force_detected':
        case 'multiple_failed_logins':
          // Auto-block IP if available
          if (alert.details?.ip_address) {
            await blockIPAddress(alert.details.ip_address, 'Automated response to brute force');
            response.response_action = 'ip_blocked';
          }
          break;

        case 'suspicious_activity_detected':
          // Escalate to security team
          await notifySecurityTeam(alert);
          response.response_action = 'security_team_notified';
          break;

        case 'sql_injection_detected':
          // Emergency security lockdown
          await emergencyLockdown('SQL injection detected');
          response.response_action = 'emergency_lockdown';
          break;

        case 'unauthorized_access_attempt':
          // Rotate affected API keys
          await rotateAllApiKeys('Emergency rotation due to unauthorized access');
          response.response_action = 'api_keys_rotated';
          break;
      }

      // Log the automated response
      await logAutomatedResponse(alert, response);
      
      toast({
        title: "Automated Response Triggered",
        description: `Action taken: ${response.response_action.replace(/_/g, ' ')}`,
        variant: "default"
      });

    } catch (error) {
      console.error('Error in automated response:', error);
      response.response_action = 'failed';
    }

    return response;
  };

  const blockIPAddress = async (ipAddress: string, reason: string) => {
    const { error } = await supabase.functions.invoke('security-response', {
      body: {
        action: 'block_ip',
        ip_address: ipAddress,
        reason,
        duration: '24h'
      }
    });

    if (error) throw error;
  };

  const emergencyLockdown = async (reason: string) => {
    const { error } = await supabase.functions.invoke('security-response', {
      body: {
        action: 'emergency_lockdown',
        reason,
        disable_api: true,
        disable_auth: false // Keep auth to allow admin access
      }
    });

    if (error) throw error;
  };

  const rotateAllApiKeys = async (reason: string) => {
    const { error } = await supabase.functions.invoke('rotate-api-keys', {
      body: {
        emergency: true,
        reason
      }
    });

    if (error) throw error;
  };

  const notifySecurityTeam = async (alert: SecurityAlert) => {
    // This would typically send email/SMS to security team
    console.log('Security team notification:', alert);
  };

  const logAutomatedResponse = async (alert: SecurityAlert, response: ThreatResponse) => {
    const { error } = await supabase
      .from('security_audit_log')
      .insert({
        action: 'automated_response',
        resource_type: 'security',
        details: {
          original_alert: alert.id,
          threat_type: response.threat_type,
          response_action: response.response_action,
          automated: response.automated
        }
      });

    if (error) console.error('Error logging automated response:', error);
  };

  const acknowledgeAlert = async (alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, acknowledged: true }
          : alert
      )
    );

    toast({
      title: "Alert Acknowledged",
      description: "Alert has been marked as acknowledged",
    });
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-5 h-5 text-destructive" />;
      case 'high': return <Shield className="w-5 h-5 text-orange-500" />;
      default: return <Ban className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-destructive bg-destructive/5';
      case 'high': return 'border-orange-500 bg-orange-50';
      default: return 'border-yellow-500 bg-yellow-50';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Security Alert System</h2>
        <div className="flex items-center gap-2">
          <Badge variant={autoResponse ? "default" : "secondary"}>
            Auto Response: {autoResponse ? "Enabled" : "Disabled"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoResponse(!autoResponse)}
          >
            {autoResponse ? "Disable" : "Enable"} Auto Response
          </Button>
        </div>
      </div>

      {alerts.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">All Clear</h3>
            <p className="text-muted-foreground">No active security alerts at this time.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <Card key={alert.id} className={`${getSeverityColor(alert.severity)} ${alert.acknowledged ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getSeverityIcon(alert.severity)}
                    <div>
                      <CardTitle className="text-lg">{getAlertDescription(alert)}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {new Date(alert.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="uppercase">
                    {alert.severity}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{alert.resource_type}</Badge>
                    {alert.acknowledged && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Acknowledged
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!alert.acknowledged && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => acknowledgeAlert(alert.id)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Acknowledge
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissAlert(alert.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};