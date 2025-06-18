
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, Activity, FileText, Zap } from 'lucide-react';
import AIMetricsDashboard from './AIMetricsDashboard';
import PredictiveAnalyticsPanel from './PredictiveAnalyticsPanel';
import ReportsExportPanel from './ReportsExportPanel';
import EnhancedQualityControlDashboard from './EnhancedQualityControlDashboard';

const AdvancedAnalyticsDashboard = () => {
  const [activeTab, setActiveTab] = useState('metrics');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Advanced AI Analytics</h1>
          <p className="text-muted-foreground">Comprehensive insights into AI messaging performance and optimization opportunities</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Performance Metrics
          </TabsTrigger>
          <TabsTrigger value="predictive" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Predictive Analytics
          </TabsTrigger>
          <TabsTrigger value="quality" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Quality Control
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Reports & Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="mt-6">
          <AIMetricsDashboard />
        </TabsContent>

        <TabsContent value="predictive" className="mt-6">
          <PredictiveAnalyticsPanel />
        </TabsContent>

        <TabsContent value="quality" className="mt-6">
          <EnhancedQualityControlDashboard />
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <ReportsExportPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedAnalyticsDashboard;
