
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Play, 
  Pause, 
  Activity, 
  Clock, 
  MessageSquare, 
  TrendingUp, 
  AlertTriangle,
  Settings,
  RefreshCw
} from 'lucide-react';

interface AutomationStats {
  totalLeadsInQueue: number;
  messagesLastHour: number;
  successRate: number;
  automationEnabled: boolean;
  lastRunTime: string | null;
  nextRunTime: string | null;
}

interface AutomationRun {
  id: string;
  started_at: string;
  completed_at: string | null;
  processed_leads: number;
  successful_sends: number;
  failed_sends: number;
  status: string;
  source: string;
}

const AutomationControlPanel = () => {
  const [stats, setStats] = useState<AutomationStats>({
    totalLeadsInQueue: 0,
    messagesLastHour: 0,
    successRate: 0,
    automationEnabled: true,
    lastRunTime: null,
    nextRunTime: null
  });
  const [recentRuns, setRecentRuns] = useState<AutomationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    fetchAutomationStats();
    fetchRecentRuns();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(() => {
      fetchAutomationStats();
      fetchRecentRuns();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchAutomationStats = async () => {
    try {
      // Get leads in queue
      const { count: queueCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('ai_opt_in', true)
        .eq('ai_sequence_paused', false)
        .not('next_ai_send_at', 'is', null)
        .lte('next_ai_send_at', new Date().toISOString());

      // Get messages sent in last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count: messagesCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('ai_generated', true)
        .gte('sent_at', oneHourAgo);

      // Get automation setting
      const { data: automationSetting } = await supabase
        .from('ai_automation_settings')
        .select('setting_value')
        .eq('setting_key', 'automation_enabled')
        .single();

      // Calculate success rate from recent runs
      const { data: recentRunsForStats } = await supabase
        .from('ai_automation_runs')
        .select('successful_sends, failed_sends')
        .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .eq('status', 'completed');

      let successRate = 0;
      if (recentRunsForStats && recentRunsForStats.length > 0) {
        const totalSuccessful = recentRunsForStats.reduce((sum, run) => sum + (run.successful_sends || 0), 0);
        const totalFailed = recentRunsForStats.reduce((sum, run) => sum + (run.failed_sends || 0), 0);
        const total = totalSuccessful + totalFailed;
        successRate = total > 0 ? Math.round((totalSuccessful / total) * 100) : 100;
      }

      setStats({
        totalLeadsInQueue: queueCount || 0,
        messagesLastHour: messagesCount || 0,
        successRate,
        automationEnabled: automationSetting?.setting_value === true,
        lastRunTime: null, // Will be set from recent runs
        nextRunTime: null // Calculate based on cron schedule
      });
    } catch (error) {
      console.error('Error fetching automation stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentRuns = async () => {
    try {
      const { data } = await supabase
        .from('ai_automation_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(5);

      if (data) {
        setRecentRuns(data as AutomationRun[]);
      }
    } catch (error) {
      console.error('Error fetching recent runs:', error);
    }
  };

  const toggleAutomation = async (enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('ai_automation_settings')
        .update({ setting_value: enabled })
        .eq('setting_key', 'automation_enabled');

      if (error) throw error;

      setStats(prev => ({ ...prev, automationEnabled: enabled }));
      
      toast({
        title: enabled ? "Automation Enabled" : "Automation Disabled",
        description: enabled 
          ? "AI messages will be sent automatically based on your schedule"
          : "Automatic message sending has been paused",
      });
    } catch (error) {
      console.error('Error toggling automation:', error);
      toast({
        title: "Error",
        description: "Failed to update automation setting",
        variant: "destructive"
      });
    }
  };

  const triggerManualRun = async () => {
    setTriggering(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-automation', {
        body: { 
          automated: false, 
          source: 'manual_trigger',
          timestamp: new Date().toISOString()
        }
      });

      if (error) throw error;

      toast({
        title: "Manual Run Triggered",
        description: `Processing ${data?.processed || 0} leads. Check recent runs for results.`,
      });

      // Refresh stats after a delay
      setTimeout(() => {
        fetchAutomationStats();
        fetchRecentRuns();
      }, 2000);
    } catch (error) {
      console.error('Error triggering manual run:', error);
      toast({
        title: "Error",
        description: "Failed to trigger manual automation run",
        variant: "destructive"
      });
    } finally {
      setTriggering(false);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
    return `${minutes}m ago`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'running':
        return <Badge variant="secondary">Running</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading automation status...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Main Control Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              AI Automation Control Panel
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">Automation</span>
                <Switch
                  checked={stats.automationEnabled}
                  onCheckedChange={toggleAutomation}
                />
              </div>
              <Button
                onClick={triggerManualRun}
                disabled={triggering}
                size="sm"
                variant="outline"
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${triggering ? 'animate-spin' : ''}`} />
                Manual Run
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!stats.automationEnabled && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Automation is currently disabled. Messages will not be sent automatically.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalLeadsInQueue}</div>
              <div className="text-sm text-muted-foreground">Leads in Queue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.messagesLastHour}</div>
              <div className="text-sm text-muted-foreground">Messages Last Hour</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.successRate}%</div>
              <div className="text-sm text-muted-foreground">Success Rate (24h)</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${stats.automationEnabled ? 'text-green-600' : 'text-red-600'}`}>
                {stats.automationEnabled ? 'ACTIVE' : 'PAUSED'}
              </div>
              <div className="text-sm text-muted-foreground">Status</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Automation Runs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Automation Runs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentRuns.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              No automation runs found. The system will start running automatically every 15 minutes.
            </div>
          ) : (
            <div className="space-y-3">
              {recentRuns.map((run) => (
                <div key={run.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    {getStatusBadge(run.status)}
                    <div>
                      <div className="font-medium">
                        {run.source === 'cron_job' ? 'Automatic Run' : 'Manual Run'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatTimeAgo(run.started_at)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">
                      {run.processed_leads} leads processed
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {run.successful_sends} sent, {run.failed_sends} failed
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Automation Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div>⏰ <strong>Schedule:</strong> Every 15 minutes during business hours (8 AM - 8 PM Central)</div>
            <div>🚀 <strong>Super Aggressive:</strong> 3 messages on day 1 (2-6 hours apart)</div>
            <div>⚡ <strong>Aggressive:</strong> Messages every 8-16 hours</div>
            <div>🤝 <strong>Gentle:</strong> Messages every 1-3 days</div>
            <div>⏸️ <strong>Auto-pause:</strong> Sequences pause when customers reply</div>
            <div>🛡️ <strong>Safety:</strong> Max 5 messages per lead per day</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AutomationControlPanel;
