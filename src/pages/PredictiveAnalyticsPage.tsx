
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GlassCard from '@/components/ui/glass-card';
import SalesForecastDashboard from '@/components/predictive/SalesForecastDashboard';
import InventoryDemandDashboard from '@/components/predictive/InventoryDemandDashboard';
import MarketIntelligenceDashboard from '@/components/predictive/MarketIntelligenceDashboard';
import PredictiveAnalyticsOverview from '@/components/predictive/PredictiveAnalyticsOverview';
import ErrorBoundary from '@/components/ErrorBoundary';
import { TrendingUp, Package, BarChart3, Brain } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';

const PredictiveAnalyticsPage = () => {
  const { profile } = useAuth();
  
  if (!profile || !['manager', 'admin'].includes(profile.role)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
        <div className="container mx-auto py-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-800 mb-4">Access Denied</h1>
            <p className="text-slate-600">Manager or Admin role required to access predictive analytics.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
        <div className="space-y-8">
          {/* Hero Header */}
          <GlassCard opacity="medium" className="p-8">
            <div className="flex items-center justify-between">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl">
                    <Brain className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                      Predictive Analytics
                    </h1>
                    <p className="text-lg text-gray-600 mt-2">
                      AI-powered forecasting and market intelligence for smarter decisions
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-gray-600">AI Models Active</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-600">Real-time Analysis</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span className="text-gray-600">Market Intelligence</span>
                  </div>
                </div>
              </div>
              
              <div className="hidden lg:block">
                <div className="grid grid-cols-2 gap-4">
                  <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                    <TrendingUp className="h-10 w-10 text-white" />
                  </div>
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <BarChart3 className="h-10 w-10 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Overview Dashboard */}
          <GlassCard opacity="medium" className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Analytics Overview</h2>
              <p className="text-gray-600">Key metrics and insights at a glance</p>
            </div>
            <PredictiveAnalyticsOverview />
          </GlassCard>

          {/* Enhanced Tabs */}
          <GlassCard opacity="medium" className="p-6">
            <Tabs defaultValue="sales" className="w-full">
              <TabsList className="grid w-full grid-cols-3 p-1 bg-white/50 rounded-xl backdrop-blur-sm">
                <TabsTrigger 
                  value="sales" 
                  className="flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>Sales Forecasting</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="inventory" 
                  className="flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
                >
                  <Package className="h-4 w-4" />
                  <span>Inventory Demand</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="market" 
                  className="flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Market Intelligence</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sales" className="mt-8 space-y-6">
                <ErrorBoundary>
                  <SalesForecastDashboard />
                </ErrorBoundary>
              </TabsContent>

              <TabsContent value="inventory" className="mt-8 space-y-6">
                <ErrorBoundary>
                  <InventoryDemandDashboard />
                </ErrorBoundary>
              </TabsContent>

              <TabsContent value="market" className="mt-8 space-y-6">
                <ErrorBoundary>
                  <MarketIntelligenceDashboard />
                </ErrorBoundary>
              </TabsContent>
            </Tabs>
          </GlassCard>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default PredictiveAnalyticsPage;
