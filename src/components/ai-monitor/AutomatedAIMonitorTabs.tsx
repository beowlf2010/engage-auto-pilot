
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Activity, BarChart3, Settings, Heart } from 'lucide-react';
import EnhancedAIQueueTab from './EnhancedAIQueueTab';
import RecentActivityTab from './RecentActivityTab';
import EnhancedAnalyticsTab from './EnhancedAnalyticsTab';
import SettingsTab from './SettingsTab';
import QueueHealthDashboard from './QueueHealthDashboard';

const AutomatedAIMonitorTabs: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold">AI Automation Monitor</h1>
        <p className="text-muted-foreground">Monitor and control your enhanced AI messaging system</p>
      </div>

      <Tabs defaultValue="health" className="p-6">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="health" className="flex items-center gap-2">
            <Heart className="w-4 h-4" />
            Queue Health
          </TabsTrigger>
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            AI Queue
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="health">
          <QueueHealthDashboard />
        </TabsContent>

        <TabsContent value="queue">
          <EnhancedAIQueueTab />
        </TabsContent>

        <TabsContent value="activity">
          <RecentActivityTab />
        </TabsContent>

        <TabsContent value="analytics">
          <EnhancedAnalyticsTab />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AutomatedAIMonitorTabs;
