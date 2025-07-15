import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Play, 
  Square, 
  Wrench,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Shield,
  Zap
} from 'lucide-react';
import { useProactiveMonitoring } from '@/hooks/useProactiveMonitoring';
import { useToast } from '@/hooks/use-toast';

const ProactiveMonitoringDashboard = () => {
  const {
    monitoringState,
    isLoading,
    error,
    startMonitoring,
    stopMonitoring,
    refreshStatus,
    runConfigurationValidation,
    autoFixIssues,
    getMetricsHistory,
    getSystemRecommendations
  } = useProactiveMonitoring();

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const handleStartMonitoring = async () => {
    setActionLoading('start');
    try {
      await startMonitoring();
      toast({
        title: "Monitoring Started",
        description: "Proactive system monitoring is now active",
      });
    } catch (err) {
      toast({
        title: "Failed to Start Monitoring",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopMonitoring = () => {
    setActionLoading('stop');
    try {
      stopMonitoring();
      toast({
        title: "Monitoring Stopped",
        description: "Proactive system monitoring has been disabled",
      });
    } catch (err) {
      toast({
        title: "Failed to Stop Monitoring",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAutoFix = async () => {
    setActionLoading('autofix');
    try {
      const result = await autoFixIssues();
      toast({
        title: "Auto-Fix Completed",
        description: `Fixed ${result.fixed} issues, ${result.failed} failed`,
      });
    } catch (err) {
      toast({
        title: "Auto-Fix Failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleValidateConfig = async () => {
    setActionLoading('validate');
    try {
      const report = await runConfigurationValidation();
      toast({
        title: "Configuration Validated",
        description: `Score: ${report.score}% - ${report.issues.length} issues found`,
      });
    } catch (err) {
      toast({
        title: "Validation Failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getTrendIcon = () => {
    switch (monitoringState.trendDirection) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'degrading':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-success';
    if (score >= 70) return 'text-warning';
    return 'text-destructive';
  };

  const getHealthBadgeVariant = (score: number) => {
    if (score >= 90) return 'default';
    if (score >= 70) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Proactive System Monitoring</h2>
          <p className="text-muted-foreground mt-1">
            Continuous health monitoring and automated issue prevention
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshStatus}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {monitoringState.isActive ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStopMonitoring}
              disabled={actionLoading === 'stop'}
            >
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleStartMonitoring}
              disabled={actionLoading === 'start'}
            >
              <Play className="h-4 w-4 mr-2" />
              Start Monitoring
            </Button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            {getTrendIcon()}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className={getHealthColor(monitoringState.currentHealthScore)}>
                {monitoringState.currentHealthScore}%
              </span>
            </div>
            <Progress 
              value={monitoringState.currentHealthScore} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Configuration</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className={getHealthColor(monitoringState.configurationScore)}>
                {monitoringState.configurationScore}%
              </span>
            </div>
            <Progress 
              value={monitoringState.configurationScore} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monitor Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={monitoringState.isActive ? 'default' : 'secondary'}>
                {monitoringState.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            {monitoringState.lastCheckTime && (
              <p className="text-xs text-muted-foreground mt-2">
                Last check: {monitoringState.lastCheckTime.toLocaleTimeString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trend</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge 
                variant={
                  monitoringState.trendDirection === 'improving' ? 'default' :
                  monitoringState.trendDirection === 'degrading' ? 'destructive' : 'secondary'
                }
              >
                {monitoringState.trendDirection}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Based on recent performance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Health Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Health Overview
                </CardTitle>
                <CardDescription>
                  Current system performance and health metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Overall Health Score</span>
                  <Badge variant={getHealthBadgeVariant(monitoringState.currentHealthScore)}>
                    {monitoringState.currentHealthScore}%
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Configuration Score</span>
                  <Badge variant={getHealthBadgeVariant(monitoringState.configurationScore)}>
                    {monitoringState.configurationScore}%
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Performance Trend</span>
                  <div className="flex items-center gap-2">
                    {getTrendIcon()}
                    <span className="text-sm text-muted-foreground capitalize">
                      {monitoringState.trendDirection}
                    </span>
                  </div>
                </div>

                {monitoringState.alertCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span>Active Alerts</span>
                    <Badge variant="destructive">
                      {monitoringState.alertCount}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>
                  Common monitoring and maintenance actions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleValidateConfig}
                  disabled={actionLoading === 'validate'}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Validate Configuration
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleAutoFix}
                  disabled={actionLoading === 'autofix'}
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  Auto-Fix Issues
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => refreshStatus()}
                  disabled={isLoading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Force Health Check
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Recommendations</CardTitle>
              <CardDescription>
                AI-generated recommendations to improve system reliability
              </CardDescription>
            </CardHeader>
            <CardContent>
              {monitoringState.recommendations.length > 0 ? (
                <div className="space-y-3">
                  {monitoringState.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{recommendation}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2" />
                  <p>No recommendations at this time</p>
                  <p className="text-xs">System is operating optimally</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monitoring Automation</CardTitle>
              <CardDescription>
                Configure automated monitoring and response settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Continuous Health Monitoring</h4>
                  <p className="text-sm text-muted-foreground">
                    Performs system health checks every 15 minutes
                  </p>
                </div>
                <Badge variant={monitoringState.isActive ? 'default' : 'secondary'}>
                  {monitoringState.isActive ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Automated Issue Resolution</h4>
                  <p className="text-sm text-muted-foreground">
                    Automatically fixes common configuration issues
                  </p>
                </div>
                <Badge variant="default">Enabled</Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Predictive Alerting</h4>
                  <p className="text-sm text-muted-foreground">
                    Alerts before issues become critical
                  </p>
                </div>
                <Badge variant="default">Enabled</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProactiveMonitoringDashboard;