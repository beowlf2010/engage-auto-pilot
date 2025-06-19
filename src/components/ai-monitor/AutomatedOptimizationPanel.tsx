import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Zap, Target, TrendingUp, Clock, CheckCircle, AlertCircle, Play, Pause } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface OptimizationRule {
  id: string;
  name: string;
  description: string;
  type: 'template' | 'timing' | 'frequency' | 'content';
  isActive: boolean;
  confidence: number;
  lastTriggered?: Date;
  impact: 'high' | 'medium' | 'low';
  status: 'active' | 'testing' | 'disabled';
}

interface AutomationMetrics {
  totalOptimizations: number;
  successfulOptimizations: number;
  averageImprovement: number;
  activeRules: number;
}

const AutomatedOptimizationPanel = () => {
  const [optimizationRules, setOptimizationRules] = useState<OptimizationRule[]>([]);
  const [metrics, setMetrics] = useState<AutomationMetrics>({
    totalOptimizations: 0,
    successfulOptimizations: 0,
    averageImprovement: 0,
    activeRules: 0
  });
  const [autoModeEnabled, setAutoModeEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeOptimizationRules();
    loadMetrics();
  }, []);

  const initializeOptimizationRules = () => {
    const defaultRules: OptimizationRule[] = [
      {
        id: 'template-optimization',
        name: 'Smart Template Selection',
        description: 'Automatically select best-performing templates based on lead characteristics',
        type: 'template',
        isActive: true,
        confidence: 85,
        impact: 'high',
        status: 'active'
      },
      {
        id: 'timing-optimization',
        name: 'Optimal Send Timing',
        description: 'Adjust message timing based on individual lead response patterns',
        type: 'timing',
        isActive: true,
        confidence: 78,
        impact: 'medium',
        status: 'active'
      },
      {
        id: 'frequency-control',
        name: 'Adaptive Frequency Control',
        description: 'Dynamically adjust message frequency based on engagement levels',
        type: 'frequency',
        isActive: false,
        confidence: 92,
        impact: 'high',
        status: 'testing'
      },
      {
        id: 'content-personalization',
        name: 'Content Personalization',
        description: 'Automatically personalize message content based on lead preferences',
        type: 'content',
        isActive: true,
        confidence: 73,
        impact: 'medium',
        status: 'active'
      },
      {
        id: 'sentiment-adaptation',
        name: 'Sentiment-Based Adaptation',
        description: 'Adjust message tone and style based on lead sentiment analysis',
        type: 'content',
        isActive: false,
        confidence: 68,
        impact: 'medium',
        status: 'disabled'
      }
    ];

    setOptimizationRules(defaultRules);
    setLoading(false);
  };

  const loadMetrics = () => {
    // Simulate loading metrics
    setTimeout(() => {
      setMetrics({
        totalOptimizations: 247,
        successfulOptimizations: 198,
        averageImprovement: 23.5,
        activeRules: 3
      });
    }, 1000);
  };

  const toggleRule = async (ruleId: string) => {
    setOptimizationRules(prev => 
      prev.map(rule => 
        rule.id === ruleId 
          ? { ...rule, isActive: !rule.isActive, status: !rule.isActive ? 'active' : 'disabled' }
          : rule
      )
    );

    toast({
      title: "Optimization Rule Updated",
      description: "The rule status has been changed successfully.",
    });
  };

  const toggleAutoMode = () => {
    setAutoModeEnabled(!autoModeEnabled);
    toast({
      title: autoModeEnabled ? "Auto Mode Disabled" : "Auto Mode Enabled",
      description: autoModeEnabled 
        ? "Manual approval required for optimizations"
        : "AI will automatically apply approved optimizations",
    });
  };

  const startOptimizationTest = (ruleId: string) => {
    setOptimizationRules(prev => 
      prev.map(rule => 
        rule.id === ruleId 
          ? { ...rule, status: 'testing' }
          : rule
      )
    );

    toast({
      title: "Optimization Test Started",
      description: "A/B testing has begun for this optimization rule.",
    });
  };

  const getRuleIcon = (type: string) => {
    switch (type) {
      case 'template': return <Target className="w-4 h-4" />;
      case 'timing': return <Clock className="w-4 h-4" />;
      case 'frequency': return <TrendingUp className="w-4 h-4" />;
      case 'content': return <Zap className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'testing': return 'text-blue-600';
      case 'disabled': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'testing': return <Play className="w-4 h-4" />;
      case 'disabled': return <Pause className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 animate-pulse text-blue-600" />
            <span>Loading optimization settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const successRate = metrics.totalOptimizations > 0 ? 
    (metrics.successfulOptimizations / metrics.totalOptimizations) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Auto Mode Control */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            Automated Optimization Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Auto Mode</h4>
              <p className="text-sm text-muted-foreground">
                Automatically apply AI optimizations without manual approval
              </p>
            </div>
            <Switch 
              checked={autoModeEnabled} 
              onCheckedChange={toggleAutoMode}
            />
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{metrics.totalOptimizations}</div>
              <div className="text-xs text-muted-foreground">Total Optimizations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{successRate.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">+{metrics.averageImprovement}%</div>
              <div className="text-xs text-muted-foreground">Avg Improvement</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{metrics.activeRules}</div>
              <div className="text-xs text-muted-foreground">Active Rules</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Optimization Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Optimization Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="active">Active Rules</TabsTrigger>
              <TabsTrigger value="testing">Testing</TabsTrigger>
              <TabsTrigger value="available">Available</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4 mt-4">
              {optimizationRules.filter(rule => rule.status === 'active').map(rule => (
                <div key={rule.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-green-600">
                        {getRuleIcon(rule.type)}
                      </div>
                      <div>
                        <h4 className="font-medium">{rule.name}</h4>
                        <p className="text-sm text-muted-foreground">{rule.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {rule.confidence}% confidence
                      </Badge>
                      <Switch 
                        checked={rule.isActive} 
                        onCheckedChange={() => toggleRule(rule.id)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className={`flex items-center gap-1 ${getStatusColor(rule.status)}`}>
                      {getStatusIcon(rule.status)}
                      <span className="capitalize">{rule.status}</span>
                    </div>
                    
                    <Badge variant={rule.impact === 'high' ? 'default' : 'secondary'}>
                      {rule.impact.toUpperCase()} impact
                    </Badge>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="testing" className="space-y-4 mt-4">
              {optimizationRules.filter(rule => rule.status === 'testing').map(rule => (
                <div key={rule.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-blue-600">
                        {getRuleIcon(rule.type)}
                      </div>
                      <div>
                        <h4 className="font-medium">{rule.name}</h4>
                        <p className="text-sm text-muted-foreground">{rule.description}</p>
                      </div>
                    </div>
                    
                    <Badge variant="outline" className="text-blue-600">
                      Testing in Progress
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Test Progress</span>
                      <span>65%</span>
                    </div>
                    <Progress value={65} className="h-2" />
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="available" className="space-y-4 mt-4">
              {optimizationRules.filter(rule => rule.status === 'disabled').map(rule => (
                <div key={rule.id} className="border rounded-lg p-4 space-y-3 opacity-60">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-gray-500">
                        {getRuleIcon(rule.type)}
                      </div>
                      <div>
                        <h4 className="font-medium">{rule.name}</h4>
                        <p className="text-sm text-muted-foreground">{rule.description}</p>
                      </div>
                    </div>
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => startOptimizationTest(rule.id)}
                    >
                      Start Test
                    </Button>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AutomatedOptimizationPanel;
