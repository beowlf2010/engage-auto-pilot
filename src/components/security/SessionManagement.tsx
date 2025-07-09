import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Monitor, Globe, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { securityService } from '@/services/securityService';

interface UserSession {
  id: string;
  ip_address?: unknown;
  user_agent?: string;
  created_at: string;
  last_accessed_at: string;
  expires_at: string;
  is_active: boolean;
}

export const SessionManagement: React.FC = () => {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const loadUserSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('is_active', true)
        .order('last_accessed_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Failed to load user sessions:', error);
      toast.error('Failed to load session information');
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      setRevoking(sessionId);
      
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false, last_accessed_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) throw error;

      // Log security event
      await securityService.logSecurityEvent({
        action: 'session_revoked',
        resource_type: 'user_sessions',
        resource_id: sessionId,
        details: { reason: 'user_initiated' }
      });

      toast.success('Session revoked successfully');
      loadUserSessions();
    } catch (error) {
      console.error('Failed to revoke session:', error);
      toast.error('Failed to revoke session');
    } finally {
      setRevoking(null);
    }
  };

  const revokeAllOtherSessions = async () => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

      const { data, error } = await supabase.rpc('revoke_all_user_sessions', {
        p_user_id: currentUser.user.id
      });

      if (error) throw error;

      toast.success(`Revoked ${data || 0} sessions`);
      loadUserSessions();
    } catch (error) {
      console.error('Failed to revoke all sessions:', error);
      toast.error('Failed to revoke sessions');
    }
  };

  const getDeviceIcon = (userAgent?: string) => {
    if (!userAgent) return Globe;
    if (userAgent.includes('Mobile')) return Smartphone;
    return Monitor;
  };

  const getDeviceInfo = (userAgent?: string): string => {
    if (!userAgent) return 'Unknown Device';
    
    // Basic user agent parsing
    if (userAgent.includes('Chrome')) return 'Chrome Browser';
    if (userAgent.includes('Firefox')) return 'Firefox Browser';
    if (userAgent.includes('Safari')) return 'Safari Browser';
    if (userAgent.includes('Mobile')) return 'Mobile Device';
    
    return 'Unknown Browser';
  };

  const isSessionExpiringSoon = (expiresAt: string): boolean => {
    const expires = new Date(expiresAt);
    const now = new Date();
    const hoursUntilExpiry = (expires.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilExpiry < 24 && hoursUntilExpiry > 0;
  };

  useEffect(() => {
    loadUserSessions();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Active Sessions</h3>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadUserSessions} variant="outline" size="sm">
            Refresh
          </Button>
          <Button onClick={revokeAllOtherSessions} variant="destructive" size="sm">
            Revoke All Others
          </Button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          No active sessions found.
        </p>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const DeviceIcon = getDeviceIcon(session.user_agent);
            const isExpiring = isSessionExpiringSoon(session.expires_at);
            
            return (
              <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <DeviceIcon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{getDeviceInfo(session.user_agent)}</p>
                      {isExpiring && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Expires Soon
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>IP: {session.ip_address || 'Unknown'}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last active: {new Date(session.last_accessed_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Expires: {new Date(session.expires_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => revokeSession(session.id)}
                  disabled={revoking === session.id}
                >
                  {revoking === session.id ? 'Revoking...' : 'Revoke'}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <h4 className="font-medium mb-2">Session Security Tips</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Always sign out from shared or public computers</li>
          <li>• Regularly review and revoke suspicious sessions</li>
          <li>• Use strong, unique passwords for your account</li>
          <li>• Enable two-factor authentication when available</li>
        </ul>
      </div>
    </Card>
  );
};