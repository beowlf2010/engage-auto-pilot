import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, Brain, Bot, Target, Zap, 
  Settings2, RefreshCw, TrendingUp, Sparkles, Activity 
} from 'lucide-react';
import InventoryIntelligenceDashboard from './InventoryIntelligenceDashboard';
import PricingIntelligence from './PricingIntelligence';
import InventoryAutomation from './InventoryAutomation';
import InventoryPerformanceTracker from './InventoryPerformanceTracker';

const EnhancedInventoryDashboard = () => {
  const [activeTab, setActiveTab] = useState('intelligence');

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Clean Header */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary text-primary-foreground">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Inventory Intelligence</h1>
                <p className="text-sm text-muted-foreground">AI-powered insights and analytics</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                <Zap className="w-3 h-3 mr-1" />
                Live
              </Badge>
              <Button variant="outline" size="sm">
                <Settings2 className="w-4 h-4 mr-1" />
                Settings
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Clean Tabs */}
      <Card className="border shadow-sm">
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b">
              <TabsList className="h-auto p-1 bg-transparent grid w-full grid-cols-4">
                <TabsTrigger 
                  value="intelligence" 
                  className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"
                >
                  <Brain className="w-4 h-4" />
                  <div className="text-center">
                    <div className="text-xs font-medium">AI Intelligence</div>
                    <div className="text-xs opacity-70">Insights</div>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="pricing" 
                  className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"
                >
                  <Target className="w-4 h-4" />
                  <div className="text-center">
                    <div className="text-xs font-medium">Pricing</div>
                    <div className="text-xs opacity-70">Analysis</div>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="automation" 
                  className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"
                >
                  <Bot className="w-4 h-4" />
                  <div className="text-center">
                    <div className="text-xs font-medium">Automation</div>
                    <div className="text-xs opacity-70">Rules</div>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="performance" 
                  className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"
                >
                  <BarChart3 className="w-4 h-4" />
                  <div className="text-center">
                    <div className="text-xs font-medium">Performance</div>
                    <div className="text-xs opacity-70">Analytics</div>
                  </div>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="intelligence" className="mt-0 space-y-0">
                <InventoryIntelligenceDashboard />
              </TabsContent>

              <TabsContent value="pricing" className="mt-0 space-y-0">
                <PricingIntelligence />
              </TabsContent>

              <TabsContent value="automation" className="mt-0 space-y-0">
                <InventoryAutomation />
              </TabsContent>

              <TabsContent value="performance" className="mt-0 space-y-0">
                <InventoryPerformanceTracker />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Clean Quick Actions */}
      <Card className="border shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-sm">Quick Actions</h3>
              <p className="text-xs text-muted-foreground">Common tasks</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-xs">
                <RefreshCw className="w-3 h-3 mr-1" />
                Refresh
              </Button>
              <Button size="sm" className="text-xs">
                <TrendingUp className="w-3 h-3 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedInventoryDashboard;