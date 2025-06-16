
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SalesForecastDashboard from '@/components/predictive/SalesForecastDashboard';
import InventoryDemandDashboard from '@/components/predictive/InventoryDemandDashboard';
import MarketIntelligenceDashboard from '@/components/predictive/MarketIntelligenceDashboard';

const PredictiveAnalyticsPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Predictive Analytics</h1>
        <p className="text-gray-600">AI-powered forecasting and market intelligence</p>
      </div>

      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sales">Sales Forecasting</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Demand</TabsTrigger>
          <TabsTrigger value="market">Market Intelligence</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-6">
          <SalesForecastDashboard />
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <InventoryDemandDashboard />
        </TabsContent>

        <TabsContent value="market" className="space-y-6">
          <MarketIntelligenceDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PredictiveAnalyticsPage;
