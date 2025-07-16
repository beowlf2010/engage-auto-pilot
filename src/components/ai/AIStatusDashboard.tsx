import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Play, Pause, AlertTriangle, CheckCircle, MessageSquare, Users, Clock, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { aiEmergencyService } from '@/services/aiEmergencyService';
import { unifiedAI } from '@/services/unifiedAIService';
import { toast } from 'sonner';

interface AIMetrics {
  totalOptedIn: number;
  readyForAI: number;
  isEmergencyDisabled: boolean;
  emergencyReason?: string;
  recentMessages: number;
  processingStatus: {
    isProcessing: boolean;
    processedCount: number;
  };
}

export const AIStatusDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<AIMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  const loadMetrics = async () => {
    try {
      // Get lead counts using count query
      const { count: optedInCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('ai_opt_in', true)
        .neq('status', 'lost')
        .neq('is_hidden', true);

      const { count: readyCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('ai_opt_in', true)
        .neq('status', 'lost')
        .neq('is_hidden', true)
        .or(`next_ai_send_at.is.null,next_ai_send_at.lte.${new Date().toISOString()}`);

      // Get recent AI messages count (last 24 hours)
      const { count: recentCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('ai_generated', true)
        .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // Get emergency status
      const isEmergencyDisabled = aiEmergencyService.isAIDisabled();
      const emergencyInfo = aiEmergencyService.getDisableInfo();

      // Get processing status
      const processingStatus = unifiedAI.getServiceStatus();

      setMetrics({
        totalOptedIn: optedInCount || 0,
        readyForAI: readyCount || 0,
        isEmergencyDisabled,
        emergencyReason: emergencyInfo?.reason,
        recentMessages: recentCount || 0,
        processingStatus
      });

    } catch (error) {
      console.error('Error loading AI metrics:', error);
      toast.error('Failed to load AI metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleManualTrigger = async () => {
    setTriggering(true);
    try {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) {
        toast.error('Authentication required');
        return;
      }

      // Use special AI system UUID for manual triggers
      await unifiedAI.processAllPendingResponses('00000000-0000-0000-0000-000000000001');
      toast.success('AI processing triggered successfully');
      
      // Reload metrics after processing
      setTimeout(loadMetrics, 2000);
    } catch (error) {
      console.error('Error triggering AI processing:', error);
      toast.error('Failed to trigger AI processing');
    } finally {
      setTriggering(false);
    }
  };

  const handleEmergencyToggle = async () => {
    try {
      if (metrics?.isEmergencyDisabled) {
        await aiEmergencyService.enableAI();
        toast.success('AI emergency shutdown disabled');
      } else {
        await aiEmergencyService.disableAI('Manual emergency stop');
        toast.success('AI emergency shutdown enabled');
      }
      loadMetrics();
    } catch (error) {
      console.error('Error toggling emergency status:', error);
      toast.error('Failed to toggle emergency status');
    }
  };

  useEffect(() => {
    loadMetrics();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="ml-2">Loading AI status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = () => {
    if (metrics?.isEmergencyDisabled) return 'destructive';
    if (metrics?.processingStatus.isProcessing) return 'default';
    if (metrics?.readyForAI && metrics.readyForAI > 0) return 'secondary';
    return 'outline';
  };

  const getStatusText = () => {
    if (metrics?.isEmergencyDisabled) return 'Emergency Shutdown';
    if (metrics?.processingStatus.isProcessing) return 'Processing';
    if (metrics?.readyForAI && metrics.readyForAI > 0) return 'Ready';
    return 'Standby';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">AI Automation Status</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMetrics}
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Badge variant={getStatusColor()}>
            {getStatusText()}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Users className="w-4 h-4 mr-2" />
              AI Enabled Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalOptedIn || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total opted into AI
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Ready to Send
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.readyForAI || 0}</div>
            <p className="text-xs text-muted-foreground">
              Scheduled for now or overdue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <MessageSquare className="w-4 h-4 mr-2" />
              Recent Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.recentMessages || 0}</div>
            <p className="text-xs text-muted-foreground">
              AI messages sent (24h)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Zap className="w-4 h-4 mr-2" />
              Processing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.processingStatus.processedCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.processingStatus.isProcessing ? 'Currently processing' : 'Last cycle processed'}
            </p>
          </CardContent>
        </Card>
      </div>

      {metrics?.isEmergencyDisabled && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-destructive mr-3" />
              <div>
                <div className="font-semibold text-destructive">AI Emergency Shutdown Active</div>
                <div className="text-sm text-muted-foreground">
                  {metrics.emergencyReason || 'Manual emergency stop'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            onClick={handleManualTrigger}
            disabled={triggering || metrics?.isEmergencyDisabled}
            className="w-full"
            variant={metrics?.readyForAI && metrics.readyForAI > 0 ? 'default' : 'outline'}
          >
            {triggering ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Process AI Messages Now
              </>
            )}
          </Button>
          
          <Button
            onClick={handleEmergencyToggle}
            variant={metrics?.isEmergencyDisabled ? 'destructive' : 'outline'}
            className="w-full"
          >
            {metrics?.isEmergencyDisabled ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Enable AI System
              </>
            ) : (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Emergency Stop
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};