import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import {
  Play,
  Pause,
  Settings,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Zap,
  Route,
  Brain
} from 'lucide-react';
import { automatedWorkflowEngine } from '@/services/automatedWorkflowEngine';
import type { AutomationMetrics } from '@/types/workflowEngine';

const WorkflowDashboard: React.FC = () => {
  const [isEngineRunning, setIsEngineRunning] = useState(false);
  const [metrics, setMetrics] = useState<AutomationMetrics>({
    totalWorkflows: 0,
    activeExecutions: 0,
    completionRate: 0,
    averageExecutionTime: 0,
    autoApprovalRate: 0,
    performanceImpact: {
      responseTimeImprovement: 0,
      conversionRateImprovement: 0,
      eficiencyGain: 0
    }
  });
  const [recentExecutions, setRecentExecutions] = useState<any[]>([]);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadMetrics = async () => {
    try {
      const automationMetrics = await automatedWorkflowEngine.getAutomationMetrics();
      setMetrics(automationMetrics);
    } catch (error) {
      console.error('Error loading workflow metrics:', error);
    }
  };

  const handleEngineToggle = async () => {
    try {
      if (isEngineRunning) {
        await automatedWorkflowEngine.stopEngine();
        setIsEngineRunning(false);
      } else {
        await automatedWorkflowEngine.startEngine();
        setIsEngineRunning(true);
      }
    } catch (error) {
      console.error('Error toggling workflow engine:', error);
    }
  };

  const formatExecutionTime = (milliseconds: number): string => {
    if (milliseconds < 1000) return `${milliseconds}ms`;
    if (milliseconds < 60000) return `${(milliseconds / 1000).toFixed(1)}s`;
    return `${(milliseconds / 60000).toFixed(1)}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Automated Workflow Engine</h1>
          <p className="text-muted-foreground mt-2">
            AI-powered automation for lead management and optimization
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Engine Status:</span>
            <Switch
              checked={isEngineRunning}
              onCheckedChange={handleEngineToggle}
            />
            <Badge variant={isEngineRunning ? "default" : "secondary"}>
              {isEngineRunning ? (
                <>
                  <Play className="h-3 w-3 mr-1" />
                  Running
                </>
              ) : (
                <>
                  <Pause className="h-3 w-3 mr-1" />
                  Stopped
                </>
              )}
            </Badge>
          </div>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalWorkflows}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.activeExecutions} currently executing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.completionRate.toFixed(1)}%</div>
            <Progress value={metrics.completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Execution Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatExecutionTime(metrics.averageExecutionTime)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per workflow execution
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Approval Rate</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.autoApprovalRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              AI-approved actions
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance Impact</TabsTrigger>
          <TabsTrigger value="routing">Lead Routing</TabsTrigger>
          <TabsTrigger value="executions">Recent Executions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Performance Impact Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Response Time</CardTitle>
                <CardDescription>Improvement in response times</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span className="text-2xl font-bold text-green-600">
                    {metrics.performanceImpact.responseTimeImprovement}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Faster initial contact
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <CardDescription>Improvement in conversions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <span className="text-2xl font-bold text-blue-600">
                    {metrics.performanceImpact.conversionRateImprovement}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Better lead-to-sale ratio
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Efficiency Gain</CardTitle>
                <CardDescription>Overall efficiency improvement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-purple-600" />
                  <span className="text-2xl font-bold text-purple-600">
                    {metrics.performanceImpact.eficiencyGain}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Reduced manual work
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Workflow Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Auto-Execution Categories</CardTitle>
                <CardDescription>Types of automated actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Follow-up Messages</span>
                  <Badge variant="secondary">85% automated</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Lead Assignments</span>
                  <Badge variant="secondary">92% automated</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Status Updates</span>
                  <Badge variant="secondary">78% automated</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Appointment Scheduling</span>
                  <Badge variant="secondary">65% automated</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Smart Triggers</CardTitle>
                <CardDescription>Active automation triggers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">New Lead Created</span>
                  <Badge variant="outline">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Status Changed</span>
                  <Badge variant="outline">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Customer Replied</span>
                  <Badge variant="outline">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Time-based Follow-up</span>
                  <Badge variant="outline">Active</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
              <CardDescription>Detailed performance metrics and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Performance Analytics</h3>
                <p className="text-muted-foreground">
                  Detailed performance charts and analytics will be displayed here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Smart Lead Routing</CardTitle>
              <CardDescription>Automated lead assignment rules and performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Route className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Lead Routing Rules</h3>
                <p className="text-muted-foreground">
                  Configure and monitor automated lead routing rules
                </p>
                <Button className="mt-4" variant="outline">
                  Configure Routing Rules
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="executions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Executions</CardTitle>
              <CardDescription>Latest workflow executions and their status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Execution History</h3>
                <p className="text-muted-foreground">
                  Recent workflow executions will be displayed here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WorkflowDashboard;