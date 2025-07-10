import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, Brain, Bot, Target, Zap, 
  Settings2, RefreshCw, TrendingUp 
} from 'lucide-react';
import InventoryIntelligenceDashboard from './InventoryIntelligenceDashboard';
import PricingIntelligence from './PricingIntelligence';
import InventoryAutomation from './InventoryAutomation';
import InventoryPerformanceTracker from './InventoryPerformanceTracker';

const EnhancedInventoryDashboard = () => {
  const [activeTab, setActiveTab] = useState('intelligence');

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Advanced Inventory Intelligence</h1>
                <p className="text-gray-600">AI-powered inventory management and optimization</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-gradient-to-r from-green-50 to-blue-50">
                <Zap className="w-3 h-3 mr-1" />
                Live Analytics
              </Badge>
              <Button variant="outline" size="sm">
                <Settings2 className="w-4 h-4 mr-2" />
                Configure
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Enhanced Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="p-6 pb-0">
              <TabsList className="grid w-full grid-cols-4 h-auto p-1">
                <TabsTrigger 
                  value="intelligence" 
                  className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-50 data-[state=active]:to-purple-50"
                >
                  <Brain className="w-5 h-5" />
                  <div className="text-center">
                    <div className="font-medium">AI Intelligence</div>
                    <div className="text-xs text-gray-500">Smart insights & recommendations</div>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="pricing" 
                  className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-gradient-to-br data-[state=active]:from-green-50 data-[state=active]:to-blue-50"
                >
                  <Target className="w-5 h-5" />
                  <div className="text-center">
                    <div className="font-medium">Pricing Intelligence</div>
                    <div className="text-xs text-gray-500">Market analysis & optimization</div>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="automation" 
                  className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-gradient-to-br data-[state=active]:from-orange-50 data-[state=active]:to-red-50"
                >
                  <Bot className="w-5 h-5" />
                  <div className="text-center">
                    <div className="font-medium">Automation</div>
                    <div className="text-xs text-gray-500">Smart rules & alerts</div>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="performance" 
                  className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-50 data-[state=active]:to-pink-50"
                >
                  <BarChart3 className="w-5 h-5" />
                  <div className="text-center">
                    <div className="font-medium">Performance</div>
                    <div className="text-xs text-gray-500">Analytics & tracking</div>
                  </div>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="intelligence" className="mt-0">
                <InventoryIntelligenceDashboard />
              </TabsContent>

              <TabsContent value="pricing" className="mt-0">
                <PricingIntelligence />
              </TabsContent>

              <TabsContent value="automation" className="mt-0">
                <InventoryAutomation />
              </TabsContent>

              <TabsContent value="performance" className="mt-0">
                <InventoryPerformanceTracker />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Quick Actions</h3>
              <p className="text-gray-600">Common inventory management tasks</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh All Data
              </Button>
              <Button variant="outline" size="sm">
                <TrendingUp className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedInventoryDashboard;