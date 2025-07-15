import React, { useState } from 'react';
import { Play, RefreshCcw, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { systemHealthService, SystemHealthReport, SystemCheck } from '@/services/systemHealthCheck';
import { toast } from 'sonner';

interface SystemHealthPanelProps {
  onSystemStart?: () => void;
}

export const SystemHealthPanel: React.FC<SystemHealthPanelProps> = ({ onSystemStart }) => {
  const [report, setReport] = useState<SystemHealthReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runSystemCheck = async () => {
    setIsRunning(true);
    try {
      const healthReport = await systemHealthService.runComprehensiveSystemCheck();
      setReport(healthReport);
      
      if (healthReport.overallStatus === 'success') {
        toast.success('System Check Complete', {
          description: 'All systems operational and ready to start.',
        });
      } else {
        toast.error('System Check Failed', {
          description: healthReport.summary,
        });
      }
    } catch (error) {
      toast.error('System Check Error', {
        description: 'Failed to complete system health check.',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSystemStart = () => {
    if (report?.canStart) {
      onSystemStart?.();
      toast.success('🚀 System Started', {
        description: 'AI operations have been initiated.',
      });
    }
  };

  const getStatusIcon = (status: SystemCheck['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: SystemCheck['status']) => {
    switch (status) {
      case 'success':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const completedChecks = report?.checks.filter(c => c.status === 'success' || c.status === 'error').length || 0;
  const totalChecks = report?.checks.length || 8;
  const progress = totalChecks > 0 ? (completedChecks / totalChecks) * 100 : 0;
  
  const criticalErrors = report?.checks.filter(c => c.status === 'error' && c.critical).length || 0;
  const warnings = report?.checks.filter(c => c.status === 'error' && !c.critical).length || 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>System Health Check</span>
          <div className="flex items-center gap-2">
            <Button
              onClick={runSystemCheck}
              disabled={isRunning}
              variant="outline"
              size="sm"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4 mr-2" />
              )}
              Run Check
            </Button>
            
            {report?.canStart && (
              <Button
                onClick={handleSystemStart}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                size="sm"
              >
                <Play className="h-4 w-4 mr-2" />
                Start System
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {report && (
          <>
            {/* Overall Status */}
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
              <div className="flex items-center gap-2">
                {getStatusIcon(report.overallStatus)}
                <span className="font-medium">Overall Status</span>
              </div>
              <Badge className={getStatusColor(report.overallStatus)}>
                {report.overallStatus.toUpperCase()}
              </Badge>
            </div>

            {/* Progress Bar */}
            {isRunning && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{completedChecks}/{totalChecks}</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Summary */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{report.summary}</p>
              {criticalErrors > 0 && (
                <div className="text-sm text-destructive font-medium">
                  ⚠️ {criticalErrors} critical error(s) must be fixed before starting
                </div>
              )}
              {warnings > 0 && (
                <div className="text-sm text-amber-600 dark:text-amber-400">
                  ⚠️ {warnings} warning(s) - system can start but may have limited functionality
                </div>
              )}
            </div>

            {/* Individual Checks */}
            <div className="space-y-2">
              {report.checks.map((check, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(check.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-sm">{check.name}</div>
                        {check.critical && (
                          <Badge variant="destructive" className="text-xs">CRITICAL</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {check.message}
                      </div>
                      {check.error && (
                        <div className="text-xs text-destructive mt-1 p-2 bg-destructive/10 rounded">
                          <strong>Error:</strong> {check.error}
                        </div>
                      )}
                      {check.details && check.status === 'success' && (
                        <div className="text-xs text-muted-foreground mt-1">
                          ✓ Additional details available
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={getStatusColor(check.status)}
                  >
                    {check.status}
                  </Badge>
                </div>
              ))}
            </div>
          </>
        )}

        {!report && !isRunning && (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Run a system health check to verify all components are operational</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};