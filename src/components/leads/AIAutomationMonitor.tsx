
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Bot, Play, AlertCircle, CheckCircle, Clock, Flame, TrendingUp, Zap } from 'lucide-react';
import { getAIAutomationStatus, triggerAIAutomation, getQueueAnalysis } from '@/services/aiAutomationService';
import { toast } from '@/hooks/use-toast';

const AIAutomationMonitor: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [queueAnalysis, setQueueAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const [statusData, analysisData] = await Promise.all([
        getAIAutomationStatus(),
        getQueueAnalysis()
      ]);
      setStatus(statusData);
      setQueueAnalysis(analysisData);
    } catch (error) {
      console.error('Error loading AI automation status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerAutomation = async () => {
    try {
      setTriggering(true);
      const result = await triggerAIAutomation();
      
      toast({
        title: "Enhanced AI Automation Triggered",
        description: `Processed ${result.processed} leads in ${result.processingTime}ms. ${result.successful} successful, ${result.failed} failed.`,
      });
      
      // Reload status after triggering
      setTimeout(loadStatus, 1000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to trigger enhanced AI automation",
        variant: "destructive",
      });
    } finally {
      setTriggering(false);
    }
  };

  useEffect(() => {
    loadStatus();
    // Refresh status every 30 seconds
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !status) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <div className="text-sm text-gray-500">Loading enhanced AI status...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSystemStatusBadge = (systemStatus: string) => {
    switch (systemStatus) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800">Healthy</Badge>;
      case 'backlogged':
        return <Badge className="bg-yellow-100 text-yellow-800">Processing Backlog</Badge>;
      default:
        return <Badge className="bg-red-100 text-red-800">Needs Attention</Badge>;
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bot className="w-5 h-5 text-blue-600" />
          Enhanced AI Automation Status
          <Badge variant="outline" className="ml-2 text-xs">
            <Zap className="w-3 h-3 mr-1" />
            High Performance
          </Badge>
          {status?.enhanced && (
            <Badge className="bg-purple-100 text-purple-800 text-xs">
              <TrendingUp className="w-3 h-3 mr-1" />
              Enhanced v2.0
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* System Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <div>
              <div className="text-sm text-gray-600">Messages Due</div>
              <div className="font-semibold">{status?.pendingMessages || 0}</div>
              {queueAnalysis?.avgOverdueHours > 0 && (
                <div className="text-xs text-gray-500">
                  Avg {queueAnalysis.avgOverdueHours}h overdue
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <div>
              <div className="text-sm text-gray-600">Sent Today</div>
              <div className="font-semibold">{status?.messagesSentToday || 0}</div>
              <div className="text-xs text-gray-500">
                {status?.avgSuccessRate || 0}% success rate
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-blue-500" />
            <div>
              <div className="text-sm text-gray-600">AI Enabled</div>
              <div className="font-semibold">{status?.totalAILeads || 0}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-500" />
            <div>
              <div className="text-sm text-gray-600">Queue Health</div>
              <div className={`font-semibold ${getHealthColor(status?.queueHealthScore || 0)}`}>
                {status?.queueHealthScore || 0}%
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-500" />
            <div>
              <div className="text-sm text-gray-600">Status</div>
              <div className="font-semibold">
                {getSystemStatusBadge(status?.systemStatus || 'unknown')}
              </div>
            </div>
          </div>
        </div>

        {/* Queue Health Progress */}
        {status?.queueHealthScore !== undefined && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">System Health</span>
              <span className={`text-sm ${getHealthColor(status.queueHealthScore)}`}>
                {status.queueHealthScore}%
              </span>
            </div>
            <Progress 
              value={status.queueHealthScore} 
              className="h-2"
            />
          </div>
        )}

        {/* Message Intensity Breakdown */}
        {queueAnalysis && (
          <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-xs text-gray-600">Aggressive</div>
              <div className="font-semibold text-red-600">
                {queueAnalysis.byIntensity?.aggressive || 0}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600">Gentle</div>
              <div className="font-semibold text-blue-600">
                {queueAnalysis.byIntensity?.gentle || 0}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600">Super Aggressive</div>
              <div className="font-semibold text-purple-600">
                {queueAnalysis.byIntensity?.super_aggressive || 0}
              </div>
            </div>
          </div>
        )}

        {/* Controls and Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getSystemStatusBadge(status?.systemStatus || 'unknown')}
            <span className="text-sm text-gray-500">
              Enhanced automation runs every 10 minutes (peak hours)
            </span>
          </div>
          
          <Button 
            onClick={handleTriggerAutomation}
            disabled={triggering}
            size="sm"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Play className="w-4 h-4" />
            {triggering ? 'Processing...' : 'Process Now'}
          </Button>
        </div>

        {/* Status Messages */}
        {status?.pendingMessages > 50 && (
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="text-sm text-yellow-800">
              <strong>High Queue Volume:</strong> {status.pendingMessages} messages in queue. 
              Enhanced system will process them in batches of 100 every 10 minutes during peak hours.
            </div>
          </div>
        )}

        {status?.systemStatus === 'healthy' && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="text-sm text-green-800">
              <strong>System Healthy:</strong> Enhanced AI automation is running optimally with parallel processing, 
              improved scheduling, and automatic data cleaning.
            </div>
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-800">
            <strong>Enhanced Features Active:</strong> 
            <ul className="mt-1 ml-4 list-disc">
              <li>100 leads per batch (vs 30 previously)</li>
              <li>Parallel processing (10 concurrent sends)</li>
              <li>Automatic bad data cleanup</li>
              <li>Intelligent priority queuing</li>
              <li>Peak hour optimization (every 10min)</li>
              <li>Increased daily limit (8 messages vs 5)</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIAutomationMonitor;
