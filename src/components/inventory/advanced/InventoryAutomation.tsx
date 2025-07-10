import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Bot, Bell, Zap, AlertTriangle, CheckCircle, 
  Clock, TrendingDown, Tag, Settings2, Play, Pause 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AutomationRule {
  id: string;
  name: string;
  type: 'pricing' | 'alerts' | 'categorization' | 'leads';
  isActive: boolean;
  trigger: string;
  action: string;
  lastTriggered?: string;
  timesTriggered: number;
  successRate: number;
}

interface AlertItem {
  id: string;
  type: 'stale_inventory' | 'price_drop_needed' | 'hot_lead_match' | 'low_stock';
  vehicleInfo: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  createdAt: string;
  action?: string;
}

const InventoryAutomation = () => {
  const [activeTab, setActiveTab] = useState('rules');

  const { data: automationRules } = useQuery({
    queryKey: ['automation-rules'],
    queryFn: async (): Promise<AutomationRule[]> => {
      // Mock automation rules - in real implementation, these would be stored in DB
      return [
        {
          id: '1',
          name: 'Auto Price Reduction',
          type: 'pricing',
          isActive: true,
          trigger: 'Vehicle > 60 days on lot',
          action: 'Reduce price by 3%',
          lastTriggered: '2024-01-09',
          timesTriggered: 23,
          successRate: 78
        },
        {
          id: '2',
          name: 'Lead Matching Alerts',
          type: 'leads',
          isActive: true,
          trigger: 'New lead matches inventory',
          action: 'Send notification to sales team',
          lastTriggered: '2024-01-10',
          timesTriggered: 156,
          successRate: 92
        },
        {
          id: '3',
          name: 'Stale Inventory Alert',
          type: 'alerts',
          isActive: true,
          trigger: 'Vehicle > 90 days on lot',
          action: 'Create urgent alert',
          lastTriggered: '2024-01-08',
          timesTriggered: 12,
          successRate: 100
        },
        {
          id: '4',
          name: 'Auto Categorization',
          type: 'categorization',
          isActive: false,
          trigger: 'New vehicle uploaded',
          action: 'Assign category & tags',
          timesTriggered: 0,
          successRate: 0
        },
        {
          id: '5',
          name: 'Market Price Sync',
          type: 'pricing',
          isActive: true,
          trigger: 'Weekly market analysis',
          action: 'Suggest price adjustments',
          lastTriggered: '2024-01-07',
          timesTriggered: 8,
          successRate: 85
        }
      ];
    }
  });

  const { data: alerts } = useQuery({
    queryKey: ['automation-alerts'],
    queryFn: async (): Promise<AlertItem[]> => {
      // Generate mock alerts
      return [
        {
          id: '1',
          type: 'stale_inventory',
          vehicleInfo: '2021 Honda Civic LX',
          severity: 'high',
          message: '95 days on lot - consider price reduction or promotion',
          createdAt: '2024-01-10T08:30:00Z',
          action: 'Reduce price by 5%'
        },
        {
          id: '2',
          type: 'hot_lead_match',
          vehicleInfo: '2022 Toyota RAV4 XLE',
          severity: 'medium',
          message: 'High-value lead interested in similar vehicle',
          createdAt: '2024-01-10T10:15:00Z',
          action: 'Contact lead immediately'
        },
        {
          id: '3',
          type: 'price_drop_needed',
          vehicleInfo: '2020 Ford F-150',
          severity: 'medium',
          message: 'Priced 12% above market average',
          createdAt: '2024-01-10T09:45:00Z',
          action: 'Adjust price to market level'
        },
        {
          id: '4',
          type: 'low_stock',
          vehicleInfo: 'Mid-size SUVs',
          severity: 'low',
          message: 'Only 3 vehicles remaining in popular category',
          createdAt: '2024-01-09T16:20:00Z',
          action: 'Consider acquiring more inventory'
        }
      ];
    }
  });

  const toggleRule = (ruleId: string) => {
    // In real implementation, this would update the rule in the database
    console.log('Toggling rule:', ruleId);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pricing': return <Tag className="w-4 h-4" />;
      case 'alerts': return <Bell className="w-4 h-4" />;
      case 'categorization': return <Bot className="w-4 h-4" />;
      case 'leads': return <Zap className="w-4 h-4" />;
      default: return <Settings2 className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'pricing': return 'bg-green-100 text-green-700';
      case 'alerts': return 'bg-orange-100 text-orange-700';
      case 'categorization': return 'bg-blue-100 text-blue-700';
      case 'leads': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'stale_inventory': return <Clock className="w-4 h-4" />;
      case 'price_drop_needed': return <TrendingDown className="w-4 h-4" />;
      case 'hot_lead_match': return <Zap className="w-4 h-4" />;
      case 'low_stock': return <AlertTriangle className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const activeRules = automationRules?.filter(rule => rule.isActive).length || 0;
  const totalRules = automationRules?.length || 0;
  const highPriorityAlerts = alerts?.filter(alert => alert.severity === 'high').length || 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            Inventory Automation
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="bg-green-50">
              {activeRules}/{totalRules} Active Rules
            </Badge>
            {highPriorityAlerts > 0 && (
              <Badge variant="destructive">
                {highPriorityAlerts} High Priority
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="rules">Automation Rules</TabsTrigger>
            <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
            <TabsTrigger value="analytics">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="space-y-4">
            <div className="space-y-3">
              {automationRules?.map((rule) => (
                <div key={rule.id} className="p-4 rounded-lg border bg-gradient-to-r from-white to-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-1.5 rounded-full ${getTypeColor(rule.type)}`}>
                          {getTypeIcon(rule.type)}
                        </div>
                        <h3 className="font-semibold">{rule.name}</h3>
                        <Badge variant="outline" className="capitalize">
                          {rule.type}
                        </Badge>
                        {rule.isActive ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <Play className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-600">
                            <Pause className="w-3 h-3 mr-1" />
                            Paused
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                        <p><strong>Trigger:</strong> {rule.trigger}</p>
                        <p><strong>Action:</strong> {rule.action}</p>
                      </div>

                      <div className="flex items-center gap-6 text-sm">
                        <div>
                          <span className="text-gray-600">Triggered: </span>
                          <span className="font-medium">{rule.timesTriggered} times</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Success Rate: </span>
                          <span className="font-medium">{rule.successRate}%</span>
                        </div>
                        {rule.lastTriggered && (
                          <div>
                            <span className="text-gray-600">Last: </span>
                            <span className="font-medium">{rule.lastTriggered}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="ml-4 flex items-center gap-3">
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={() => toggleRule(rule.id)}
                      />
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <Button className="w-full" variant="outline">
              <Settings2 className="w-4 h-4 mr-2" />
              Create New Rule
            </Button>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <div className="space-y-3">
              {alerts?.map((alert) => (
                <div key={alert.id} className="p-4 rounded-lg border bg-gradient-to-r from-white to-orange-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-1.5 rounded-full bg-orange-100 text-orange-600">
                          {getAlertIcon(alert.type)}
                        </div>
                        <h3 className="font-semibold">{alert.vehicleInfo}</h3>
                        <Badge variant={getSeverityColor(alert.severity)}>
                          {alert.severity} priority
                        </Badge>
                      </div>
                      
                      <p className="text-gray-700 mb-2">{alert.message}</p>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Created: {new Date(alert.createdAt).toLocaleDateString()}</span>
                        {alert.action && (
                          <span className="text-blue-600 font-medium">
                            Suggested: {alert.action}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="ml-4 space-y-2">
                      <Button size="sm" variant="outline">
                        Take Action
                      </Button>
                      <Button size="sm" variant="ghost">
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border bg-gradient-to-br from-blue-50 to-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-blue-700">Total Actions</p>
                  <Zap className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {automationRules?.reduce((sum, rule) => sum + rule.timesTriggered, 0) || 0}
                </p>
                <p className="text-xs text-blue-600 mt-1">This month</p>
              </div>

              <div className="p-4 rounded-lg border bg-gradient-to-br from-green-50 to-green-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-green-700">Success Rate</p>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {Math.round((automationRules?.reduce((sum, rule) => sum + rule.successRate, 0) || 0) / (automationRules?.length || 1))}%
                </p>
                <p className="text-xs text-green-600 mt-1">Average across all rules</p>
              </div>

              <div className="p-4 rounded-lg border bg-gradient-to-br from-orange-50 to-orange-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-orange-700">Time Saved</p>
                  <Clock className="w-8 h-8 text-orange-600" />
                </div>
                <p className="text-2xl font-bold text-orange-600">24h</p>
                <p className="text-xs text-orange-600 mt-1">Estimated weekly</p>
              </div>
            </div>

            <div className="p-4 rounded-lg border">
              <h3 className="font-semibold mb-4">Rule Performance</h3>
              <div className="space-y-3">
                {automationRules?.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between">
                    <span className="text-sm">{rule.name}</span>
                    <div className="flex items-center gap-2 w-32">
                      <Progress value={rule.successRate} className="flex-1" />
                      <span className="text-xs text-gray-600 w-8">{rule.successRate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default InventoryAutomation;