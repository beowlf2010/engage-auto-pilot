import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, Zap, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { smsPipelineMonitor, SMSPipelineHealth } from '@/services/sms/smsPipelineMonitor';
import { useToast } from "@/components/ui/use-toast";

export const SMSPipelineHealthMonitor = () => {
  const [health, setHealth] = useState<SMSPipelineHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const { toast } = useToast();

  const loadHealth = async () => {
    setLoading(true);
    try {
      const healthStatus = await smsPipelineMonitor.getHealthStatus();
      setHealth(healthStatus);
    } catch (error) {
      console.error('Error loading SMS health:', error);
      toast({
        title: "Error",
        description: "Failed to load SMS pipeline health",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const runMaintenance = async () => {
    setMaintenanceLoading(true);
    try {
      const result = await smsPipelineMonitor.performMaintenance();
      setHealth(result.healthAfter);
      
      toast({
        title: "Maintenance Complete",
        description: `Retried ${result.messagesRetried} messages, cleaned ${result.messagesCleaned} stuck messages. Health improved by ${result.healthAfter.healthScore - result.healthBefore.healthScore} points.`,
      });
    } catch (error) {
      console.error('Error running maintenance:', error);
      toast({
        title: "Maintenance Failed",
        description: "Failed to run SMS pipeline maintenance",
        variant: "destructive"
      });
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getHealthBadgeVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  useEffect(() => {
    loadHealth();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!health) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            SMS Pipeline Health
          </CardTitle>
          <CardDescription>
            Monitoring SMS delivery status and pipeline health
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              SMS Pipeline Health
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getHealthBadgeVariant(health.healthScore)}>
                {health.healthScore}% Health
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={loadHealth}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Real-time monitoring of SMS delivery status and pipeline performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-green-500">{health.totalSent}</div>
              <div className="text-sm text-muted-foreground">Sent (24h)</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="text-2xl font-bold text-yellow-500">{health.totalPending}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div className="text-2xl font-bold text-red-500">{health.totalFailed}</div>
              <div className="text-sm text-muted-foreground">Failed (24h)</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Zap className={`h-5 w-5 ${getHealthColor(health.healthScore)}`} />
              </div>
              <div className={`text-2xl font-bold ${getHealthColor(health.healthScore)}`}>
                {health.healthScore}%
              </div>
              <div className="text-sm text-muted-foreground">Health Score</div>
            </div>
          </div>

          {health.totalPending > 0 && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {health.totalPending} messages are stuck in pending status.
                {health.oldestPending && (
                  <> Oldest pending message from {new Date(health.oldestPending).toLocaleString()}.</>
                )}
              </AlertDescription>
            </Alert>
          )}

          {health.recentFailures.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Recent Failures (Last Hour)</h4>
              {health.recentFailures.map((failure) => (
                <div key={failure.id} className="text-sm p-2 bg-red-50 border-l-4 border-red-200 rounded">
                  <div className="font-medium">Lead: {failure.lead_id}</div>
                  <div className="text-red-600">{failure.error}</div>
                  <div className="text-muted-foreground">
                    {new Date(failure.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 mt-6">
            <Button
              onClick={runMaintenance}
              disabled={maintenanceLoading}
              variant={health.healthScore < 80 ? "default" : "outline"}
            >
              {maintenanceLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Run Maintenance
            </Button>
            
            {health.totalFailed > 0 && (
              <Button
                onClick={() => smsPipelineMonitor.retryFailedMessages()}
                variant="outline"
              >
                Retry Failed Messages
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};