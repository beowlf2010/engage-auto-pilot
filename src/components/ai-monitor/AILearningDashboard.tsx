
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, TrendingUp, Zap, Target, Settings, BarChart3, Activity, MessageSquare } from 'lucide-react';
import LearningAnalyticsSummary from './LearningAnalyticsSummary';
import PredictiveInsightsPanel from './PredictiveInsightsPanel';
import AutomatedOptimizationPanel from './AutomatedOptimizationPanel';
import AdvancedPerformanceMetrics from './AdvancedPerformanceMetrics';
import SmartAIQueueTab from './SmartAIQueueTab';
import RealtimeLearningDashboard from './RealtimeLearningDashboard';

const AILearningDashboard = () => {
  const [activeTab, setActiveTab] = useState('summary');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-blue-600" />
            AI Learning Dashboard
          </h1>
          <p className="text-muted-foreground">
            Advanced AI learning analytics, optimization, and predictive insights
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Learning Summary
          </TabsTrigger>
          <TabsTrigger value="realtime" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Real-time
          </TabsTrigger>
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Smart Queue
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Predictive Insights
          </TabsTrigger>
          <TabsTrigger value="optimization" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Auto Optimization
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Advanced Metrics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-6">
          <LearningAnalyticsSummary />
        </TabsContent>

        <TabsContent value="realtime" className="mt-6">
          <RealtimeLearningDashboard />
        </TabsContent>

        <TabsContent value="queue" className="mt-6">
          <SmartAIQueueTab />
        </TabsContent>

        <TabsContent value="insights" className="mt-6">
          <PredictiveInsightsPanel />
        </TabsContent>

        <TabsContent value="optimization" className="mt-6">
          <AutomatedOptimizationPanel />
        </TabsContent>

        <TabsContent value="metrics" className="mt-6">
          <AdvancedPerformanceMetrics />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AILearningDashboard;
