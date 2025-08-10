import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Play, 
  Pause, 
  Square, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users, 
  MessageSquare,
  Shield
} from 'lucide-react';

interface AutomationControl {
  id: string;
  automation_enabled: boolean;
  emergency_stop: boolean;
  max_concurrent_runs: number;
  global_timeout_minutes: number;
}

interface AutomationRun {
  id: string;
  source: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  leads_processed: number | null;
  leads_successful: number | null;
  leads_failed: number | null;
  error_message: string | null;
  processing_time_ms: number | null;
  total_queued: number | null;
}

interface SystemHealth {
  healthy: boolean;
  issues: string[];
  totalQueued: number;
  activeRuns: number;
  lastSuccessfulRun: string | null;
}

export const AIAutomationControlDashboard = () => {
  const [controlSettings, setControlSettings] = useState<AutomationControl | null>(null);
  const [recentRuns, setRecentRuns] = useState<AutomationRun[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [sinceHours, setSinceHours] = useState<number>(24);
  const [totalToEnable, setTotalToEnable] = useState<number>(50);
  const [maxPerHour, setMaxPerHour] = useState<number>(20);
  const [startAt, setStartAt] = useState<string>('');
  const { toast } = useToast();

  const fetchSystemStatus = async () => {
    try {
      // Fetch control settings
      const { data: control, error: controlError } = await supabase
        .from('ai_automation_control')
        .select('*')
        .limit(1)
        .single();

      if (controlError) throw controlError;
      setControlSettings(control);

      // Fetch recent runs
      const { data: runs, error: runsError } = await supabase
        .from('ai_automation_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (runsError) throw runsError;
      setRecentRuns(runs || []);

      // Calculate system health
      const activeRuns = runs?.filter(run => run.status === 'running').length || 0;
      const totalQueued = runs?.[0]?.total_queued || 0;
      const lastSuccessfulRun = runs?.find(run => run.status === 'completed')?.completed_at || null;
      
      const issues: string[] = [];
      if (activeRuns > 0) issues.push(`${activeRuns} active runs`);
      if (control?.emergency_stop) issues.push('Emergency stop active');
      if (!control?.automation_enabled) issues.push('Automation disabled');
      
      setSystemHealth({
        healthy: issues.length === 0,
        issues,
        totalQueued,
        activeRuns,
        lastSuccessfulRun
      });

    } catch (error) {
      console.error('Error fetching system status:', error);
      toast({
        title: "Error",
        description: "Failed to fetch system status",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateControlSettings = async (updates: Partial<AutomationControl>) => {
    if (!controlSettings) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('ai_automation_control')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', controlSettings.id);

      if (error) throw error;

      setControlSettings({ ...controlSettings, ...updates });
      toast({
        title: "Success",
        description: "Automation settings updated",
        variant: "default"
      });

      // Refresh status after update
      await fetchSystemStatus();
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const triggerManualRun = async () => {
    setIsUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-automation', {
        body: {
          automated: false,
          source: 'manual_dashboard',
          priority: 'high'
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Manual automation run triggered",
        variant: "default"
      });

      // Refresh status after manual run
      setTimeout(() => fetchSystemStatus(), 2000);
    } catch (error) {
      console.error('Error triggering manual run:', error);
      toast({
        title: "Error",
        description: "Failed to trigger manual run",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const triggerPacedEnable = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase.functions.invoke('ai-paced-enable', {
        body: {
          sinceHours,
          totalToEnable,
          maxPerHour,
          startAt: startAt || null,
          source: 'manual_dashboard'
        }
      });
      if (error) throw error;
      toast({ title: 'Paced enable queued', description: `Enabling ${totalToEnable} leads over time`, variant: 'default' });
    } catch (error) {
      console.error('Error pacing enable:', error);
      toast({ title: 'Error', description: 'Failed to start paced enable', variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'running': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'running': return <Clock className="w-4 h-4" />;
      case 'failed': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  useEffect(() => {
    fetchSystemStatus();
    const interval = setInterval(fetchSystemStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            AI Automation System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${systemHealth?.healthy ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="font-medium">
                {systemHealth?.healthy ? 'Healthy' : 'Issues Detected'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{systemHealth?.totalQueued || 0} Queued</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{systemHealth?.activeRuns || 0} Active</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span>
                Last Success: {systemHealth?.lastSuccessfulRun ? 
                  formatDateTime(systemHealth.lastSuccessfulRun) : 'Never'}
              </span>
            </div>
          </div>
          
          {systemHealth?.issues && systemHealth.issues.length > 0 && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Issues:</span>
              </div>
              <ul className="mt-2 text-sm text-amber-700 list-disc list-inside">
                {systemHealth.issues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Control Panel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Automation Status</label>
              <div className="flex gap-2">
                <Button
                  variant={controlSettings?.automation_enabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateControlSettings({ automation_enabled: true })}
                  disabled={isUpdating}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Enable
                </Button>
                <Button
                  variant={!controlSettings?.automation_enabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateControlSettings({ automation_enabled: false })}
                  disabled={isUpdating}
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Disable
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Emergency Stop</label>
              <Button
                variant={controlSettings?.emergency_stop ? "destructive" : "outline"}
                size="sm"
                onClick={() => updateControlSettings({ 
                  emergency_stop: !controlSettings?.emergency_stop 
                })}
                disabled={isUpdating}
              >
                <Square className="w-4 h-4 mr-2" />
                {controlSettings?.emergency_stop ? 'STOP ACTIVE' : 'Emergency Stop'}
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Manual Control</label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={triggerManualRun}
                  disabled={isUpdating || controlSettings?.emergency_stop}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Run Now
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchSystemStatus}
                  disabled={isUpdating}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Max Concurrent Runs:</span> {controlSettings?.max_concurrent_runs}
            </div>
            <div>
              <span className="font-medium">Global Timeout:</span> {controlSettings?.global_timeout_minutes} minutes
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Paced AI Enable */}
      <Card>
        <CardHeader>
          <CardTitle>Paced AI Enable</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="text-sm font-medium">Since (hours)</label>
              <Input type="number" min={1} max={168} value={sinceHours} onChange={(e) => setSinceHours(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium">Total to enable</label>
              <Input type="number" min={1} max={1000} value={totalToEnable} onChange={(e) => setTotalToEnable(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium">Max per hour</label>
              <Input type="number" min={1} max={200} value={maxPerHour} onChange={(e) => setMaxPerHour(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium">Start at (optional)</label>
              <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={triggerPacedEnable} disabled={isUpdating || controlSettings?.emergency_stop}>
                <Play className="w-4 h-4 mr-2" />
                Start Paced Enable
              </Button>
              <Button variant="outline" size="sm" onClick={fetchSystemStatus} disabled={isUpdating}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Automation Runs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Automation Runs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentRuns.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No automation runs found
              </div>
            ) : (
              recentRuns.map((run) => (
                <div key={run.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(run.status)}
                      <Badge className={`${getStatusColor(run.status)} text-white`}>
                        {run.status}
                      </Badge>
                      <span className="text-sm font-medium">
                        {run.source}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatDateTime(run.started_at)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Processed:</span> {run.leads_processed || 0}
                    </div>
                    <div>
                      <span className="font-medium">Successful:</span> {run.leads_successful || 0}
                    </div>
                    <div>
                      <span className="font-medium">Failed:</span> {run.leads_failed || 0}
                    </div>
                    <div>
                      <span className="font-medium">Duration:</span> {formatDuration(run.processing_time_ms)}
                    </div>
                  </div>
                  
                  {run.error_message && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                      <span className="font-medium">Error:</span> {run.error_message}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};