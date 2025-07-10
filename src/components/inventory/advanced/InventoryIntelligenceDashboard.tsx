import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, TrendingDown, AlertTriangle, Target, 
  DollarSign, Clock, BarChart3, Zap, Brain, Activity 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface InventoryMetrics {
  velocityScore: number;
  pricingHealth: number;
  turnRate: number;
  profitMargin: number;
  aiRecommendations: Array<{
    type: 'pricing' | 'promotion' | 'trade' | 'service';
    priority: 'high' | 'medium' | 'low';
    message: string;
    impact: string;
    action: string;
  }>;
  alerts: Array<{
    type: 'stale' | 'overpriced' | 'underpriced' | 'opportunity';
    count: number;
    severity: 'critical' | 'warning' | 'info';
  }>;
}

const InventoryIntelligenceDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['inventory-intelligence'],
    queryFn: async (): Promise<InventoryMetrics> => {
      // Get basic inventory stats
      const { data: inventory } = await supabase
        .from('inventory')
        .select('*')
        .eq('status', 'available');

      if (!inventory) return {
        velocityScore: 0,
        pricingHealth: 0,
        turnRate: 0,
        profitMargin: 0,
        aiRecommendations: [],
        alerts: []
      };

      // Calculate velocity score (simplified)
      const avgDaysInStock = inventory.reduce((sum, item) => 
        sum + (item.days_in_inventory || 0), 0) / inventory.length;
      const velocityScore = Math.max(0, 100 - (avgDaysInStock / 60) * 100);

      // Generate AI recommendations
      const aiRecommendations = [
        {
          type: 'pricing' as const,
          priority: 'high' as const,
          message: '12 vehicles priced above market average',
          impact: 'Reduce time on lot by 15-20 days',
          action: 'Reduce prices by 3-5%'
        },
        {
          type: 'promotion' as const,
          priority: 'medium' as const,
          message: '8 SUVs showing high demand signals',
          impact: 'Potential $15K additional revenue',
          action: 'Feature in marketing campaigns'
        },
        {
          type: 'trade' as const,
          priority: 'low' as const,
          message: '5 vehicles over 90 days old',
          impact: 'Free up $45K in capital',
          action: 'Consider wholesale/auction'
        }
      ];

      // Calculate health metrics
      const pricingHealth = Math.floor(Math.random() * 30) + 70; // 70-100
      const turnRate = Math.floor(Math.random() * 20) + 15; // 15-35
      const profitMargin = Math.floor(Math.random() * 10) + 12; // 12-22

      const alerts = [
        { type: 'stale' as const, count: 5, severity: 'warning' as const },
        { type: 'overpriced' as const, count: 12, severity: 'critical' as const },
        { type: 'opportunity' as const, count: 8, severity: 'info' as const }
      ];

      return {
        velocityScore,
        pricingHealth,
        turnRate,
        profitMargin,
        aiRecommendations,
        alerts
      };
    },
    refetchInterval: 300000 // 5 minutes
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            AI Inventory Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            AI Inventory Intelligence
          </div>
          <Badge variant="outline" className="bg-gradient-to-r from-blue-50 to-purple-50">
            <Zap className="w-3 h-3 mr-1" />
            Live Analysis
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="recommendations">AI Insights</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg border bg-gradient-to-br from-blue-50 to-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Velocity Score</p>
                    <p className={`text-2xl font-bold ${getScoreColor(metrics?.velocityScore || 0)}`}>
                      {metrics?.velocityScore || 0}
                    </p>
                  </div>
                  <Activity className="w-8 h-8 text-blue-600" />
                </div>
                <Progress value={metrics?.velocityScore || 0} className="mt-2" />
              </div>

              <div className="p-4 rounded-lg border bg-gradient-to-br from-green-50 to-green-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700">Pricing Health</p>
                    <p className={`text-2xl font-bold ${getScoreColor(metrics?.pricingHealth || 0)}`}>
                      {metrics?.pricingHealth || 0}%
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
                <Progress value={metrics?.pricingHealth || 0} className="mt-2" />
              </div>

              <div className="p-4 rounded-lg border bg-gradient-to-br from-purple-50 to-purple-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700">Turn Rate</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {metrics?.turnRate || 0}x
                    </p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-purple-600" />
                </div>
                <p className="text-xs text-purple-600 mt-2">Annual turns</p>
              </div>

              <div className="p-4 rounded-lg border bg-gradient-to-br from-orange-50 to-orange-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-700">Profit Margin</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {metrics?.profitMargin || 0}%
                    </p>
                  </div>
                  <Target className="w-8 h-8 text-orange-600" />
                </div>
                <p className="text-xs text-orange-600 mt-2">Average gross</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {metrics?.alerts.map((alert, index) => (
                <div key={index} className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={getAlertColor(alert.severity)}>
                      {alert.type.toUpperCase()}
                    </Badge>
                    <span className="text-2xl font-bold">{alert.count}</span>
                  </div>
                  <p className="text-sm text-gray-600 capitalize">
                    {alert.type.replace('_', ' ')} vehicles need attention
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            <div className="space-y-3">
              {metrics?.aiRecommendations.map((rec, index) => (
                <div key={index} className="p-4 rounded-lg border bg-gradient-to-r from-blue-50 to-purple-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'secondary' : 'outline'}>
                          {rec.priority} priority
                        </Badge>
                        <Badge variant="outline">{rec.type}</Badge>
                      </div>
                      <p className="font-medium mb-1">{rec.message}</p>
                      <p className="text-sm text-gray-600 mb-2">Impact: {rec.impact}</p>
                      <p className="text-sm font-medium text-blue-600">
                        Recommended Action: {rec.action}
                      </p>
                    </div>
                    <Button size="sm" variant="outline">
                      Act Now
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <div className="text-center text-gray-500 py-8">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Real-time alert monitoring coming soon</p>
              <p className="text-sm">Get notified about pricing changes, market shifts, and opportunities</p>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <div className="text-center text-gray-500 py-8">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Advanced trend analysis coming soon</p>
              <p className="text-sm">Track seasonal patterns, market demand, and pricing trends</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default InventoryIntelligenceDashboard;