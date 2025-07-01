
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, CheckCircle, Clock, Pause, Play, 
  RefreshCw, Users, Zap, Settings, TrendingUp 
} from 'lucide-react';
import { getQueueHealthStatus, getAutomationSettings, unpauseStaleLeads, getOverdueLeadsDetails } from '@/services/queueHealthService';
import { triggerAIAutomation } from '@/services/aiAutomationService';
import { toast } from '@/hooks/use-toast';
import type { QueueHealthData, AutomationSettings } from '@/services/queueHealthService';

const QueueHealthDashboard: React.FC = () => {
  const [healthData, setHealthData] = useState<QueueHealthData | null>(null);
  const [settings, setSettings] = useState<AutomationSettings | null>(null);
  const [overdueLeads, setOverdueLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [unpausing, setUnpausing] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [health, automationSettings, overdue] = await Promise.all([
        getQueueHealthStatus(),
        getAutomationSettings(),
        getOverdueLeadsDetails()
      ]);
      
      setHealthData(health);
      setSettings(automationSettings);
      setOverdueLeads(overdue);
    } catch (error) {
      console.error('Error loading queue health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerAutomation = async () => {
    try {
      setTriggering(true);
      const result = await triggerAIAutomation();
      
      toast({
        title: "AI Automation Triggered",
        description: `Processed ${result.processed} leads. Success: ${result.successful}, Failed: ${result.failed}`,
      });
      
      setTimeout(loadData, 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to trigger AI automation",
        variant: "destructive",
      });
    } finally {
      setTriggering(false);
    }
  };

  const handleUnpauseStaleLeads = async () => {
    try {
      setUnpausing(true);
      const count = await unpauseStaleLeads();
      
      toast({
        title: "Stale Leads Unpaused",
        description: `${count} leads have been unpaused and scheduled for messaging`,
      });
      
      setTimeout(loadData, 1000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unpause stale leads",
        variant: "destructive",
      });
    } finally {
      setUnpausing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-100 text-green-800">Healthy</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
    return <Badge className="bg-red-100 text-red-800">Critical</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            Loading queue health data...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            AI Automation Queue Health
            <Badge variant="outline" className="ml-2">
              Real-time
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Overdue Messages</div>
                <div className="text-xl font-bold text-red-600">
                  {healthData?.totalOverdue || 0}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Processing</div>
                <div className="text-xl font-bold text-blue-600">
                  {healthData?.totalProcessing || 0}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <Pause className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Paused</div>
                <div className="text-xl font-bold text-orange-600">
                  {healthData?.totalPaused || 0}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Health Score</div>
                <div className={`text-xl font-bold ${getHealthColor(healthData?.queueHealthScore || 0)}`}>
                  {healthData?.queueHealthScore || 0}%
                </div>
              </div>
            </div>
          </div>

          {/* Health Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall System Health</span>
              {getHealthBadge(healthData?.queueHealthScore || 0)}
            </div>
            <Progress 
              value={healthData?.queueHealthScore || 0} 
              className="h-3"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              onClick={handleTriggerAutomation}
              disabled={triggering}
              className="flex items-center gap-2"
            >
              {triggering ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Process Now
            </Button>

            <Button 
              onClick={handleUnpauseStaleLeads}
              disabled={unpausing}
              variant="outline"
              className="flex items-center gap-2"
            >
              {unpausing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Users className="w-4 h-4" />
              )}
              Unpause Stale Leads
            </Button>

            <Button 
              onClick={loadData}
              variant="ghost"
              size="sm"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Configuration */}
      {settings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Current Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <div className="text-sm text-gray-600">Batch Size</div>
                <div className="font-semibold">{settings.batchSize} leads</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Concurrent Sends</div>
                <div className="font-semibold">{settings.maxConcurrentSends}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Daily Limit</div>
                <div className="font-semibold">{settings.dailyMessageLimit} msg/lead</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Auto-Unpause</div>
                <div className="font-semibold">
                  {settings.autoUnpauseStaleLeads ? (
                    <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                  ) : (
                    <Badge variant="outline">Disabled</Badge>
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Stale Threshold</div>
                <div className="font-semibold">{settings.stalePauseThresholdDays} days</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overdue Leads Details */}
      {overdueLeads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Overdue Leads ({overdueLeads.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {overdueLeads.slice(0, 10).map((lead) => (
                <div key={lead.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <div className="font-medium">
                      {lead.first_name} {lead.last_name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {lead.vehicle_interest}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {lead.ai_sequence_paused ? (
                        <Badge variant="outline" className="text-orange-600">
                          Paused: {lead.ai_pause_reason || 'Unknown'}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          Overdue: {Math.floor((Date.now() - new Date(lead.next_ai_send_at).getTime()) / (1000 * 60 * 60))}h
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      Messages sent: {lead.ai_messages_sent || 0}
                    </div>
                  </div>
                </div>
              ))}
              {overdueLeads.length > 10 && (
                <div className="text-center text-sm text-gray-500 p-2">
                  And {overdueLeads.length - 10} more overdue leads...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Messages */}
      {healthData?.alertsTriggered && healthData.alertsTriggered.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <div>
                <div className="font-medium text-yellow-800">System Alerts</div>
                <div className="text-sm text-yellow-700">
                  {healthData.alertsTriggered.join(', ')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-xs text-gray-500 text-center">
        Last updated: {healthData?.lastCheckTime ? new Date(healthData.lastCheckTime).toLocaleString() : 'Unknown'}
        <br />
        Queue health updates every 5 minutes • Automation runs every 10 minutes (peak hours)
      </div>
    </div>
  );
};

export default QueueHealthDashboard;
