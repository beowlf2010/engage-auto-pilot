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
    <div className="w-full space-y-8 animate-fade-in">
      {/* Stunning Hero Header */}
      <div className="relative overflow-hidden">
        <Card className="border-0 bg-gradient-primary shadow-floating animate-scale-in">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-accent/20 animate-pulse-glow" />
          <CardHeader className="relative">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl animate-pulse-glow" />
                  <div className="relative p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-glow">
                    <Brain className="w-8 h-8 text-white animate-float" />
                  </div>
                </div>
                <div className="text-white">
                  <h1 className="text-3xl font-bold mb-1 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80">
                    Advanced Inventory Intelligence
                  </h1>
                  <p className="text-white/80 text-lg">AI-powered inventory management & optimization</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-white/10 text-white border-white/20 backdrop-blur-sm hover:bg-white/20 transition-all duration-300">
                  <Sparkles className="w-3 h-3 mr-1 animate-pulse" />
                  Live Analytics
                </Badge>
                <Button variant="secondary" size="sm" className="bg-white/10 text-white border-white/20 backdrop-blur-sm hover:bg-white/20 transition-all duration-300">
                  <Settings2 className="w-4 h-4 mr-2" />
                  Configure
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Enhanced Navigation Tabs */}
      <Card className="border-0 shadow-elegant bg-gradient-subtle animate-slide-in-right">
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="p-8 pb-0">
              <TabsList className="grid w-full grid-cols-4 h-auto p-2 bg-gradient-surface shadow-card rounded-2xl border-0">
                <TabsTrigger 
                  value="intelligence" 
                  className="flex flex-col items-center gap-3 p-6 rounded-xl transition-all duration-300 data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-glow data-[state=active]:scale-105 hover:scale-102 hover:bg-muted/50"
                >
                  <div className="relative">
                    <Brain className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
                    {activeTab === 'intelligence' && (
                      <div className="absolute inset-0 bg-white/20 rounded-full blur-lg animate-pulse-glow" />
                    )}
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-sm">AI Intelligence</div>
                    <div className="text-xs opacity-70">Smart insights & recommendations</div>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="pricing" 
                  className="flex flex-col items-center gap-3 p-6 rounded-xl transition-all duration-300 data-[state=active]:bg-gradient-success data-[state=active]:text-white data-[state=active]:shadow-glow data-[state=active]:scale-105 hover:scale-102 hover:bg-muted/50"
                >
                  <div className="relative">
                    <Target className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
                    {activeTab === 'pricing' && (
                      <div className="absolute inset-0 bg-white/20 rounded-full blur-lg animate-pulse-glow" />
                    )}
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-sm">Pricing Intelligence</div>
                    <div className="text-xs opacity-70">Market analysis & optimization</div>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="automation" 
                  className="flex flex-col items-center gap-3 p-6 rounded-xl transition-all duration-300 data-[state=active]:bg-gradient-warning data-[state=active]:text-white data-[state=active]:shadow-glow data-[state=active]:scale-105 hover:scale-102 hover:bg-muted/50"
                >
                  <div className="relative">
                    <Bot className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
                    {activeTab === 'automation' && (
                      <div className="absolute inset-0 bg-white/20 rounded-full blur-lg animate-pulse-glow" />
                    )}
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-sm">Automation</div>
                    <div className="text-xs opacity-70">Smart rules & alerts</div>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="performance" 
                  className="flex flex-col items-center gap-3 p-6 rounded-xl transition-all duration-300 data-[state=active]:bg-gradient-accent data-[state=active]:text-white data-[state=active]:shadow-glow data-[state=active]:scale-105 hover:scale-102 hover:bg-muted/50"
                >
                  <div className="relative">
                    <BarChart3 className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
                    {activeTab === 'performance' && (
                      <div className="absolute inset-0 bg-white/20 rounded-full blur-lg animate-pulse-glow" />
                    )}
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-sm">Performance</div>
                    <div className="text-xs opacity-70">Analytics & tracking</div>
                  </div>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-8">
              <TabsContent value="intelligence" className="mt-0 animate-fade-in">
                <InventoryIntelligenceDashboard />
              </TabsContent>

              <TabsContent value="pricing" className="mt-0 animate-fade-in">
                <PricingIntelligence />
              </TabsContent>

              <TabsContent value="automation" className="mt-0 animate-fade-in">
                <InventoryAutomation />
              </TabsContent>

              <TabsContent value="performance" className="mt-0 animate-fade-in">
                <InventoryPerformanceTracker />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Enhanced Quick Actions */}
      <Card className="border-0 shadow-card bg-gradient-subtle animate-bounce-in">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-primary text-white shadow-glow">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-xl text-foreground">Quick Actions</h3>
                <p className="text-muted-foreground">Common inventory management tasks</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                size="lg"
                className="hover:shadow-elegant transition-all duration-300 hover:scale-105 border-2"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Refresh All Data
              </Button>
              <Button 
                className="bg-gradient-primary hover:shadow-glow transition-all duration-300 hover:scale-105 text-white border-0"
                size="lg"
              >
                <TrendingUp className="w-5 h-5 mr-2" />
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