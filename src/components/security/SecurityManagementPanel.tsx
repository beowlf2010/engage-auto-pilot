import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Shield, AlertTriangle, Settings, Users, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmergencySettings {
  id: string;
  ai_disabled: boolean;
  disable_reason: string | null;
  disabled_by: string | null;
  disabled_at: string | null;
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
}

export const SecurityManagementPanel: React.FC = () => {
  const [emergencySettings, setEmergencySettings] = useState<EmergencySettings | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecuritySettings();
  }, []);

  const loadSecuritySettings = async () => {
    try {
      setLoading(true);
      
      // Load emergency settings
      const { data: emergencyData, error: emergencyError } = await supabase
        .from('ai_emergency_settings')
        .select('*')
        .single();

      if (emergencyError && emergencyError.code !== 'PGRST116') {
        throw emergencyError;
      }

      // Load user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .order('role', { ascending: false });

      if (rolesError) throw rolesError;

      setEmergencySettings(emergencyData);
      setUserRoles(rolesData || []);
    } catch (error) {
      console.error('Failed to load security settings:', error);
      toast.error('Failed to load security settings');
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencyToggle = async (disabled: boolean) => {
    try {
      const currentUser = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('ai_emergency_settings')
        .upsert({
          ai_disabled: disabled,
          disable_reason: disabled ? 'Manual emergency shutdown' : null,
          disabled_by: disabled ? currentUser.data.user?.id : null,
          disabled_at: disabled ? new Date().toISOString() : null
        });

      if (error) throw error;

      setEmergencySettings(prev => prev ? {
        ...prev,
        ai_disabled: disabled,
        disable_reason: disabled ? 'Manual emergency shutdown' : null,
        disabled_by: disabled ? currentUser.data.user?.id : null,
        disabled_at: disabled ? new Date().toISOString() : null
      } : null);

      toast.success(disabled ? 'AI system disabled' : 'AI system enabled');
    } catch (error) {
      console.error('Failed to toggle emergency mode:', error);
      toast.error('Failed to update emergency settings');
    }
  };

  const promoteToAdmin = async (userId: string) => {
    try {
      const { error } = await supabase.functions.invoke('security-response', {
        body: {
          action: 'promote_to_admin',
          user_id: userId,
          reason: 'Manual promotion via security panel'
        }
      });

      if (error) throw error;

      await loadSecuritySettings();
      toast.success('User promoted to admin');
    } catch (error) {
      console.error('Failed to promote user:', error);
      toast.error('Failed to promote user to admin');
    }
  };

  const revokeAdminAccess = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) throw error;

      await loadSecuritySettings();
      toast.success('Admin access revoked');
    } catch (error) {
      console.error('Failed to revoke admin access:', error);
      toast.error('Failed to revoke admin access');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Security Management</h2>
      </div>

      {/* Emergency Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Emergency Controls
          </CardTitle>
          <CardDescription>
            Emergency shutdown controls for critical security situations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border-2 border-destructive/20 rounded-lg bg-destructive/5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-destructive">AI System Emergency Shutdown</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Immediately disable all AI operations across the system
                </p>
                {emergencySettings?.ai_disabled && emergencySettings.disabled_at && (
                  <p className="text-xs text-destructive mt-2">
                    Disabled at: {new Date(emergencySettings.disabled_at).toLocaleString()}
                  </p>
                )}
              </div>
              <Switch
                checked={emergencySettings?.ai_disabled || false}
                onCheckedChange={handleEmergencyToggle}
                className="data-[state=checked]:bg-destructive"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Role Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Role Management
          </CardTitle>
          <CardDescription>
            Manage user permissions and administrative access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-semibold">Current User Roles</h4>
            {userRoles.map((userRole) => (
              <div key={userRole.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">
                      User {userRole.user_id.substring(0, 8)}...
                    </span>
                    <Badge 
                      variant={userRole.role === 'admin' ? 'destructive' : 
                               userRole.role === 'manager' ? 'secondary' : 'default'}
                    >
                      {userRole.role}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    User ID: {userRole.user_id}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {userRole.role !== 'admin' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => promoteToAdmin(userRole.user_id)}
                    >
                      Promote to Admin
                    </Button>
                  )}
                  {userRole.role === 'admin' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => revokeAdminAccess(userRole.user_id)}
                      className="text-destructive hover:text-destructive"
                    >
                      Revoke Admin
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {userRoles.length === 0 && (
              <p className="text-muted-foreground text-center py-4">No user roles found</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            System Security Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-4 w-4" />
                <span className="font-medium">AI System</span>
              </div>
              <Badge variant={emergencySettings?.ai_disabled ? 'destructive' : 'default'}>
                {emergencySettings?.ai_disabled ? 'Disabled' : 'Active'}
              </Badge>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4" />
                <span className="font-medium">Admin Users</span>
              </div>
              <span className="text-2xl font-bold">
                {userRoles.filter(role => role.role === 'admin').length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};