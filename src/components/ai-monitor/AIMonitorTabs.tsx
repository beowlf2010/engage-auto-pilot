
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, MessageSquare, Clock, Settings, Zap, Activity } from 'lucide-react';
import EnhancedAIQueueTab from './EnhancedAIQueueTab';
import AdvancedAnalyticsDashboard from './AdvancedAnalyticsDashboard';
import MessageScheduleOverview from './MessageScheduleOverview';
import QualityControlDashboard from './QualityControlDashboard';
import SettingsTab from './SettingsTab';

const AIMonitorTabs = () => {
  return (
    <Tabs defaultValue="queue" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="queue" className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          AI Queue
        </TabsTrigger>
        <TabsTrigger value="analytics" className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Analytics
        </TabsTrigger>
        <TabsTrigger value="schedule" className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Schedule
        </TabsTrigger>
        <TabsTrigger value="quality" className="flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Quality
        </TabsTrigger>
        <TabsTrigger value="settings" className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Settings
        </TabsTrigger>
      </TabsList>

      <TabsContent value="queue" className="mt-6">
        <EnhancedAIQueueTab />
      </TabsContent>

      <TabsContent value="analytics" className="mt-6">
        <AdvancedAnalyticsDashboard />
      </TabsContent>

      <TabsContent value="schedule" className="mt-6">
        <MessageScheduleOverview />
      </TabsContent>

      <TabsContent value="quality" className="mt-6">
        <QualityControlDashboard />
      </TabsContent>

      <TabsContent value="settings" className="mt-6">
        <SettingsTab />
      </TabsContent>
    </Tabs>
  );
};

export default AIMonitorTabs;
