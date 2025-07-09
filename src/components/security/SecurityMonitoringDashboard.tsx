import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, Eye, Users, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { securityService, SecurityAuditLog } from '@/services/securityService';
import { toast } from 'sonner';

interface SecurityMetrics {
  totalEvents: number;
  suspiciousActivity: number;
  failedLogins: number;
  adminPromotions: number;
  recentEvents: SecurityAuditLog[];
}

export const SecurityMonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalEvents: 0,
    suspiciousActivity: 0,
    failedLogins: 0,
    adminPromotions: 0,
    recentEvents: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSecurityMetrics = async () => {
    try {
      setRefreshing(true);
      
      // Get recent security audit logs
      const recentEvents = await securityService.getSecurityAuditLogs(50);
      
      // Calculate metrics from events
      const totalEvents = recentEvents.length;
      const suspiciousActivity = recentEvents.filter(event => 
        event.action.includes('unauthorized') || event.action.includes('rate_limit')
      ).length;
      const failedLogins = recentEvents.filter(event => 
        event.action === 'failed_login_attempt'
      ).length;
      const adminPromotions = recentEvents.filter(event => 
        event.action === 'admin_promotion_successful'
      ).length;

      setMetrics({
        totalEvents,
        suspiciousActivity,
        failedLogins,
        adminPromotions,
        recentEvents: recentEvents.slice(0, 10) // Show only most recent 10
      });
    } catch (error) {
      console.error('Failed to load security metrics:', error);
      toast.error('Failed to load security metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const revokeUserSessions = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('revoke_all_user_sessions', {
        p_user_id: userId
      });

      if (error) throw error;

      toast.success(`Revoked ${data || 0} user sessions`);
      
      // Log security action
      await securityService.logSecurityEvent({
        action: 'admin_revoked_sessions',
        resource_type: 'user_sessions',
        resource_id: userId,
        details: { revoked_sessions: data || 0 }
      });
      
      loadSecurityMetrics();
    } catch (error) {
      console.error('Failed to revoke sessions:', error);
      toast.error('Failed to revoke user sessions');
    }
  };

  const getEventSeverity = (action: string): 'default' | 'secondary' | 'destructive' => {
    if (action.includes('unauthorized') || action.includes('failed')) return 'destructive';
    if (action.includes('promotion') || action.includes('revoked')) return 'secondary';
    return 'default';
  };

  const formatEventAction = (action: string): string => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  useEffect(() => {
    loadSecurityMetrics();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadSecurityMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Security Monitoring</h2>
        </div>
        <Button 
          onClick={loadSecurityMetrics} 
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <Clock className="h-4 w-4 mr-2" />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Security Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Events</p>
              <p className="text-2xl font-bold">{metrics.totalEvents}</p>
            </div>
            <Eye className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Suspicious Activity</p>
              <p className="text-2xl font-bold text-orange-600">{metrics.suspiciousActivity}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Failed Logins</p>
              <p className="text-2xl font-bold text-red-600">{metrics.failedLogins}</p>
            </div>
            <Shield className="h-8 w-8 text-red-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Admin Promotions</p>
              <p className="text-2xl font-bold text-green-600">{metrics.adminPromotions}</p>
            </div>
            <Users className="h-8 w-8 text-green-500" />
          </div>
        </Card>
      </div>

      {/* Recent Security Events */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Security Events</h3>
        {metrics.recentEvents.length === 0 ? (
          <p className="text-muted-foreground">No recent security events found.</p>
        ) : (
          <div className="space-y-3">
            {metrics.recentEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={getEventSeverity(event.action)}>
                      {formatEventAction(event.action)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {event.resource_type}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(event.created_at).toLocaleString()}
                  </p>
                  {event.details && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {JSON.stringify(event.details, null, 2).slice(0, 100)}...
                    </p>
                  )}
                </div>
                {event.user_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => revokeUserSessions(event.user_id)}
                    className="ml-2"
                  >
                    Revoke Sessions
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};