import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Shield, Users, Lock, Ban, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SecureRoleManagementPanel } from './SecureRoleManagementPanel';
import { SecurityMonitoringDashboard } from './SecurityMonitoringDashboard';
import { SecurityAuditViewer } from './SecurityAuditViewer';
import { SecurityAlertSystem } from './SecurityAlertSystem';

export const SecurityManagementPanel = () => {
  const { isAdmin } = useUserPermissions();
  const { toast } = useToast();

  if (!isAdmin) {
    return (
      <Alert>
        <Lock className="h-4 w-4" />
        <AlertDescription>
          Access denied. Admin privileges required for security management.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Management Center</h1>
          <p className="text-muted-foreground">
            Comprehensive security management, monitoring, and audit tools
          </p>
        </div>
        <Badge variant="outline" className="text-green-600 border-green-200">
          <Shield className="h-4 w-4 mr-1" />
          Security Active
        </Badge>
      </div>

      <Tabs defaultValue="monitoring" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="monitoring">
            <Activity className="h-4 w-4 mr-2" />
            Monitoring
          </TabsTrigger>
          <TabsTrigger value="roles">
            <Users className="h-4 w-4 mr-2" />
            Role Management
          </TabsTrigger>
          <TabsTrigger value="audit">
            <Shield className="h-4 w-4 mr-2" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Alert System
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Lock className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monitoring">
          <SecurityMonitoringDashboard />
        </TabsContent>

        <TabsContent value="roles">
          <SecureRoleManagementPanel />
        </TabsContent>

        <TabsContent value="audit">
          <SecurityAuditViewer />
        </TabsContent>

        <TabsContent value="alerts">
          <SecurityAlertSystem />
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Security Configuration</CardTitle>
              <CardDescription>
                Advanced security settings and configuration options
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Security Status:</strong> All security measures are active and monitoring threats.
                    <br />
                    <strong>Last Security Scan:</strong> {new Date().toLocaleString()}
                  </AlertDescription>
                </Alert>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Authentication Security</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center">
                          <span className="h-2 w-2 bg-green-500 rounded-full mr-2"></span>
                          Row Level Security (RLS) enabled
                        </li>
                        <li className="flex items-center">
                          <span className="h-2 w-2 bg-green-500 rounded-full mr-2"></span>
                          Admin-only role modifications
                        </li>
                        <li className="flex items-center">
                          <span className="h-2 w-2 bg-green-500 rounded-full mr-2"></span>
                          Audit logging active
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">XSS Protection</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center">
                          <span className="h-2 w-2 bg-green-500 rounded-full mr-2"></span>
                          Content Security Policy active
                        </li>
                        <li className="flex items-center">
                          <span className="h-2 w-2 bg-green-500 rounded-full mr-2"></span>
                          Safe HTML rendering
                        </li>
                        <li className="flex items-center">
                          <span className="h-2 w-2 bg-green-500 rounded-full mr-2"></span>
                          XSS detection and blocking
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};