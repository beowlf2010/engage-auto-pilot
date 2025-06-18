
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Shield, Users, TrendingUp, BarChart3, FileText } from 'lucide-react';
import MessageQualityAnalysis from './MessageQualityAnalysis';
import ComplianceMonitoringPanel from './ComplianceMonitoringPanel';
import TrainingRecommendationsPanel from './TrainingRecommendationsPanel';
import PredictiveAnalyticsPanel from './PredictiveAnalyticsPanel';
import ReportsExportPanel from './ReportsExportPanel';

const EnhancedQualityControlDashboard = () => {
  const [activeTab, setActiveTab] = useState('quality');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quality Control Dashboard</h1>
          <p className="text-muted-foreground">Monitor and improve AI messaging quality, compliance, and performance</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="quality" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Quality Analysis
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="training" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Training
          </TabsTrigger>
          <TabsTrigger value="predictive" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Predictive
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quality" className="mt-6">
          <MessageQualityAnalysis />
        </TabsContent>

        <TabsContent value="compliance" className="mt-6">
          <ComplianceMonitoringPanel />
        </TabsContent>

        <TabsContent value="training" className="mt-6">
          <TrainingRecommendationsPanel />
        </TabsContent>

        <TabsContent value="predictive" className="mt-6">
          <PredictiveAnalyticsPanel />
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <ReportsExportPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedQualityControlDashboard;
