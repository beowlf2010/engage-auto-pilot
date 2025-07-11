import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock, PlayCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AutomationRun {
  id: string;
  started_at: string;
  completed_at?: string | null;
  source: string;
  leads_processed: number | null;
  leads_successful: number | null;
  leads_failed: number | null;
  total_queued: number | null;
  processing_time_ms?: number | null;
  status: string;
  error_message?: string | null;
  metadata?: any;
  created_at?: string;
}

interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  overdue_leads: number;
  recent_runs: number;
  last_successful_run?: string;
  issues: string[];
  timestamp: string;
}

export const AutomationMonitor = () => {
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      // Fetch recent automation runs
      const { data: runsData, error: runsError } = await supabase
        .from('ai_automation_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10);

      if (runsError) {
        console.error('Error fetching runs:', runsError);
      } else {
        setRuns(runsData || []);
      }

      // Fetch health status
      const { data: healthData, error: healthError } = await supabase
        .rpc('check_ai_automation_health');

      if (healthError) {
        console.error('Error fetching health:', healthError);
      } else {
        setHealth(healthData as unknown as HealthStatus);
      }
    } catch (error) {
      console.error('Error fetching automation data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerAutomation = async () => {
    setIsTriggering(true);
    try {
      const { data, error } = await supabase.rpc('trigger_ai_automation_manual');
      
      if (error) {
        console.error('Error triggering automation:', error);
        toast.error('Failed to trigger AI automation');
      } else {
        console.log('Automation triggered:', data);
        toast.success('AI automation triggered successfully');
        // Refresh data after a short delay
        setTimeout(fetchData, 2000);
      }
    } catch (error) {
      console.error('Error triggering automation:', error);
      toast.error('Failed to trigger AI automation');
    } finally {
      setIsTriggering(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500';
      case 'warning':
        return 'text-yellow-500';
      case 'critical':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Health Status Card */}
      {health && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  AI Automation Health
                  <Badge 
                    variant={health.status === 'healthy' ? 'default' : 'destructive'}
                    className={getHealthColor(health.status)}
                  >
                    {health.status.toUpperCase()}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  System status and performance metrics
                </CardDescription>
              </div>
              <Button
                onClick={fetchData}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {health.overdue_leads}
                </div>
                <div className="text-sm text-muted-foreground">Overdue Leads</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {health.recent_runs}
                </div>
                <div className="text-sm text-muted-foreground">Recent Runs (2h)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {health.last_successful_run ? 
                    new Date(health.last_successful_run).toLocaleTimeString() : 
                    'Never'
                  }
                </div>
                <div className="text-sm text-muted-foreground">Last Success</div>
              </div>
              <div className="text-center">
                <Button
                  onClick={triggerAutomation}
                  disabled={isTriggering}
                  className="w-full"
                  variant={health.status === 'critical' ? 'destructive' : 'default'}
                >
                  {isTriggering ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <PlayCircle className="h-4 w-4 mr-2" />
                  )}
                  Trigger Now
                </Button>
              </div>
            </div>
            
            {health.issues.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">Issues Detected:</h4>
                <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                  {health.issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Runs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Automation Runs</CardTitle>
          <CardDescription>
            Latest AI automation executions and their results
          </CardDescription>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No automation runs found
            </div>
          ) : (
            <div className="space-y-3">
              {runs.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(run.status)}
                    <div>
                      <div className="font-medium">
                        {run.source} • {new Date(run.started_at).toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {run.status === 'completed' && (
                          <>
                            {run.leads_successful || 0}/{run.leads_processed || 0} successful
                            {run.processing_time_ms && (
                              <> • {Math.round(run.processing_time_ms / 1000)}s</>
                            )}
                          </>
                        )}
                        {run.status === 'failed' && run.error_message && (
                          <span className="text-red-600">{run.error_message}</span>
                        )}
                        {run.status === 'running' && 'In progress...'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">
                      {run.status}
                    </Badge>
                    {(run.total_queued || 0) > 0 && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {run.total_queued} queued
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};