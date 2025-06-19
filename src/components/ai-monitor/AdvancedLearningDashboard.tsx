
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Target, Zap, BarChart3, TrendingUp, Settings } from 'lucide-react';
import PredictiveAnalyticsDashboard from './PredictiveAnalyticsDashboard';
import AutomatedDecisionPanel from './AutomatedDecisionPanel';
import LearningAnalyticsSummary from './LearningAnalyticsSummary';
import AdvancedPerformanceMetrics from './AdvancedPerformanceMetrics';

const AdvancedLearningDashboard = () => {
  const [activeTab, setActiveTab] = useState('predictive');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-blue-600" />
            Advanced AI Learning & Analytics
          </h1>
          <p className="text-muted-foreground">
            Predictive analytics, automated decisions, and comprehensive learning insights
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="predictive" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Predictive Analytics
          </TabsTrigger>
          <TabsTrigger value="decisions" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Automated Decisions
          </TabsTrigger>
          <TabsTrigger value="learning" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Learning Summary
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Advanced Metrics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="predictive" className="mt-6">
          <PredictiveAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="decisions" className="mt-6">
          <AutomatedDecisionPanel />
        </TabsContent>

        <TabsContent value="learning" className="mt-6">
          <LearningAnalyticsSummary />
        </TabsContent>

        <TabsContent value="metrics" className="mt-6">
          <AdvancedPerformanceMetrics />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedLearningDashboard;
