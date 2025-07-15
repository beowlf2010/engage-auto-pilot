import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Wrench, ExternalLink, Play, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { systemHealthService, SystemHealthReport, SystemCheck } from '@/services/systemHealthCheck';
import { toast } from 'sonner';

interface TroubleshootingPanelProps {
  report: SystemHealthReport | null;
  onRunCheck: () => void;
  onSystemStart?: () => void;
  isRunning: boolean;
}

export const TroubleshootingPanel: React.FC<TroubleshootingPanelProps> = ({
  report,
  onRunCheck,
  onSystemStart,
  isRunning
}) => {
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);
  const [fixingCheck, setFixingCheck] = useState<string | null>(null);

  const handleAutoFix = async (check: SystemCheck) => {
    if (!check.canAutoFix) return;

    setFixingCheck(check.name);
    try {
      let success = false;
      
      switch (check.name) {
        case 'Database Connection':
          success = await systemHealthService.autoFixDatabaseConnection();
          break;
        case 'Emergency Systems':
          success = await systemHealthService.autoFixEmergencySettings();
          break;
        default:
          success = false;
      }

      if (success) {
        toast.success('Auto-fix Successful', {
          description: `${check.name} has been automatically resolved.`
        });
        onRunCheck(); // Re-run the check
      } else {
        toast.error('Auto-fix Failed', {
          description: `Could not automatically fix ${check.name}. Please follow manual troubleshooting steps.`
        });
      }
    } catch (error) {
      toast.error('Auto-fix Error', {
        description: `Error attempting to fix ${check.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setFixingCheck(null);
    }
  };

  const getStatusIcon = (status: SystemCheck['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: SystemCheck['status']) => {
    switch (status) {
      case 'success':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'error':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'running':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };

  const healthScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const failedChecks = report?.checks.filter(c => c.status === 'error') || [];
  const criticalFailures = failedChecks.filter(c => c.critical);
  const warnings = failedChecks.filter(c => !c.critical);

  return (
    <div className="space-y-4">
      {/* System Health Overview */}
      {report && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>System Health Overview</span>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold ${healthScoreColor(report.healthScore)}`}>
                  {report.healthScore}%
                </span>
                <Badge className={getStatusColor(report.overallStatus)}>
                  {report.overallStatus.toUpperCase()}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{report.summary}</p>
            
            {report.criticalIssues.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-semibold text-red-800 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Critical Issues ({report.criticalIssues.length})
                </h4>
                <ul className="text-sm text-red-700 mt-1">
                  {report.criticalIssues.map((issue, idx) => (
                    <li key={idx}>• {issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {report.warnings.length > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-semibold text-yellow-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Warnings ({report.warnings.length})
                </h4>
                <ul className="text-sm text-yellow-700 mt-1">
                  {report.warnings.map((warning, idx) => (
                    <li key={idx}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {report.recommendations.length > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-800">Recommendations</h4>
                <ul className="text-sm text-blue-700 mt-1 space-y-1">
                  {report.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={onRunCheck}
                disabled={isRunning}
                variant="outline"
                size="sm"
              >
                {isRunning ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Re-run Check
              </Button>
              
              {report.canStart && (
                <Button
                  onClick={onSystemStart}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  size="sm"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start System
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Troubleshooting */}
      {failedChecks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Troubleshooting Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {failedChecks.map((check, index) => (
              <div key={index} className="border rounded-lg">
                <Collapsible 
                  open={expandedCheck === check.name}
                  onOpenChange={() => setExpandedCheck(expandedCheck === check.name ? null : check.name)}
                >
                  <CollapsibleTrigger className="w-full p-3 text-left hover:bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(check.status)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{check.name}</span>
                            {check.critical && (
                              <Badge variant="destructive" className="text-xs">CRITICAL</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {check.error}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {check.canAutoFix && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAutoFix(check);
                            }}
                            disabled={fixingCheck === check.name}
                          >
                            {fixingCheck === check.name ? (
                              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Wrench className="h-3 w-3 mr-1" />
                            )}
                            Auto-fix
                          </Button>
                        )}
                        <RefreshCw className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="px-3 pb-3">
                    <div className="space-y-4 mt-3">
                      {/* Troubleshooting Steps */}
                      {check.troubleshootingSteps && check.troubleshootingSteps.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2">Troubleshooting Steps:</h4>
                          <div className="space-y-2">
                            {check.troubleshootingSteps.map((step, stepIdx) => (
                              <div key={stepIdx} className="flex items-start gap-2 p-2 bg-muted/30 rounded">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs flex items-center justify-center font-medium">
                                  {stepIdx + 1}
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{step.step}</div>
                                  <div className="text-xs text-muted-foreground">{step.description}</div>
                                  {step.action && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="mt-1"
                                      onClick={step.action}
                                    >
                                      {step.actionLabel || 'Take Action'}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Remediation Suggestions */}
                      {check.remediationSuggestions && check.remediationSuggestions.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2">Quick Fixes:</h4>
                          <ul className="text-sm space-y-1">
                            {check.remediationSuggestions.map((suggestion, suggIdx) => (
                              <li key={suggIdx} className="flex items-start gap-2">
                                <span className="text-blue-600">•</span>
                                {suggestion}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Links to external resources */}
                      <div className="pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open('https://docs.lovable.dev/tips-tricks/troubleshooting', '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View Documentation
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};