
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AIQueueTab from '@/components/ai-monitor/AIQueueTab';
import RecentActivityTab from '@/components/ai-monitor/RecentActivityTab';
import AnalyticsTab from '@/components/ai-monitor/AnalyticsTab';
import SettingsTab from '@/components/ai-monitor/SettingsTab';

const AIMessageMonitor = () => {
  const [activeTab, setActiveTab] = useState('queue');

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="queue">AI Queue</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="queue">
          <AIQueueTab />
        </TabsContent>

        <TabsContent value="activity">
          <RecentActivityTab />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIMessageMonitor;
