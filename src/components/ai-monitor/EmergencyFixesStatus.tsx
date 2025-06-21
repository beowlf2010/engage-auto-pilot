
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { bulkValidateVehicleInterests } from '@/services/vehicleInterestValidator';
import { 
  CheckCircle, 
  AlertTriangle, 
  Database, 
  MessageSquare, 
  RefreshCw,
  Activity
} from 'lucide-react';

interface SystemHealth {
  aiEnabledAtColumnExists: boolean;
  approvalQueueTableExists: boolean;
  corruptedVehicleInterests: number;
  overdueLeads: number;
  pendingApprovals: number;
}

const EmergencyFixesStatus = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const { toast } = useToast();

  const checkSystemHealth = async () => {
    try {
      setLoading(true);

      // Check if ai_enabled_at column exists by querying the table directly
      let aiEnabledAtExists = false;
      try {
        const { error } = await supabase
          .from('leads')
          .select('ai_enabled_at')
          .limit(1);
        aiEnabledAtExists = !error;
      } catch {
        aiEnabledAtExists = false;
      }

      // Check if approval queue table exists by querying it directly
      let approvalQueueExists = false;
      try {
        const { error } = await supabase
          .from('ai_message_approval_queue')
          .select('id')
          .limit(1);
        approvalQueueExists = !error;
      } catch {
        approvalQueueExists = false;
      }

      // Count corrupted vehicle interests
      const { data: corruptedLeads } = await supabase
        .from('leads')
        .select('id')
        .or(`vehicle_interest.is.null,vehicle_interest.eq.'',vehicle_interest.ilike.%unknown%,vehicle_interest.ilike.%not specified%`);

      // Count overdue leads
      const now = new Date().toISOString();
      const { data: overdueLeads } = await supabase
        .from('leads')
        .select('id')
        .eq('ai_opt_in', true)
        .eq('ai_sequence_paused', false)
        .not('next_ai_send_at', 'is', null)
        .lt('next_ai_send_at', now);

      // Count pending approvals
      const { data: pendingMessages } = await supabase
        .from('ai_message_approval_queue')
        .select('id')
        .eq('approved', false)
        .eq('rejected', false)
        .is('sent_at', null);

      setHealth({
        aiEnabledAtColumnExists: aiEnabledAtExists,
        approvalQueueTableExists: approvalQueueExists,
        corruptedVehicleInterests: corruptedLeads?.length || 0,
        overdueLeads: overdueLeads?.length || 0,
        pendingApprovals: pendingMessages?.length || 0
      });
    } catch (error) {
      console.error('Error checking system health:', error);
      toast({
        title: "Error",
        description: "Failed to check system health",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const runVehicleInterestValidation = async () => {
    try {
      setValidating(true);
      const updatedCount = await bulkValidateVehicleInterests();
      
      toast({
        title: "Validation Complete",
        description: `Updated ${updatedCount} vehicle interests`,
      });
      
      checkSystemHealth(); // Refresh health status
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to validate vehicle interests",
        variant: "destructive"
      });
    } finally {
      setValidating(false);
    }
  };

  const getStatusIcon = (isHealthy: boolean) => {
    return isHealthy ? 
      <CheckCircle className="h-4 w-4 text-green-600" /> : 
      <AlertTriangle className="h-4 w-4 text-red-600" />;
  };

  const getStatusBadge = (isHealthy: boolean) => {
    return (
      <Badge variant={isHealthy ? "default" : "destructive"}>
        {isHealthy ? "Healthy" : "Needs Attention"}
      </Badge>
    );
  };

  useEffect(() => {
    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Checking system health...</p>
        </CardContent>
      </Card>
    );
  }

  if (!health) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
          <p className="text-gray-500">Failed to load system health</p>
        </CardContent>
      </Card>
    );
  }

  const overallHealthy = health.aiEnabledAtColumnExists && 
                        health.approvalQueueTableExists && 
                        health.corruptedVehicleInterests === 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Emergency Fixes Status</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            {getStatusBadge(overallHealthy)}
            <Button onClick={checkSystemHealth} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Database Schema */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
          <div className="flex items-center space-x-3">
            {getStatusIcon(health.aiEnabledAtColumnExists)}
            <div>
              <p className="text-sm font-medium">AI Enabled At Column</p>
              <p className="text-xs text-gray-500">Required for edge function stability</p>
            </div>
          </div>
          {getStatusBadge(health.aiEnabledAtColumnExists)}
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
          <div className="flex items-center space-x-3">
            {getStatusIcon(health.approvalQueueTableExists)}
            <div>
              <p className="text-sm font-medium">Approval Queue Table</p>
              <p className="text-xs text-gray-500">Message approval system</p>
            </div>
          </div>
          {getStatusBadge(health.approvalQueueTableExists)}
        </div>

        {/* Data Quality */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
          <div className="flex items-center space-x-3">
            {getStatusIcon(health.corruptedVehicleInterests === 0)}
            <div>
              <p className="text-sm font-medium">Vehicle Interest Data</p>
              <p className="text-xs text-gray-500">
                {health.corruptedVehicleInterests} corrupted records found
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {health.corruptedVehicleInterests > 0 && (
              <Button 
                onClick={runVehicleInterestValidation}
                disabled={validating}
                size="sm"
                variant="outline"
              >
                {validating ? 'Fixing...' : 'Fix Now'}
              </Button>
            )}
            {getStatusBadge(health.corruptedVehicleInterests === 0)}
          </div>
        </div>

        {/* Operational Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
          <div className="flex items-center space-x-3">
            <MessageSquare className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-sm font-medium">Pending Approvals</p>
              <p className="text-xs text-gray-500">{health.pendingApprovals} messages awaiting review</p>
            </div>
          </div>
          <Badge variant="secondary">{health.pendingApprovals}</Badge>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
          <div className="flex items-center space-x-3">
            <Database className="h-4 w-4 text-purple-600" />
            <div>
              <p className="text-sm font-medium">Overdue Leads</p>
              <p className="text-xs text-gray-500">{health.overdueLeads} leads past scheduled send time</p>
            </div>
          </div>
          <Badge variant={health.overdueLeads > 0 ? "destructive" : "secondary"}>
            {health.overdueLeads}
          </Badge>
        </div>

        {/* Action Required */}
        {!overallHealthy && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Action Required</p>
                <p className="text-xs text-red-600 mt-1">
                  System issues detected. Please address the items marked as "Needs Attention" above.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmergencyFixesStatus;
