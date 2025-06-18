
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EnhancedAIQueueTab from '@/components/ai-monitor/EnhancedAIQueueTab';
import MessageScheduleOverview from '@/components/ai-monitor/MessageScheduleOverview';
import MessageQueueCalendar from '@/components/ai-monitor/MessageQueueCalendar';
import RecentActivityTab from '@/components/ai-monitor/RecentActivityTab';
import EnhancedAnalyticsTab from '@/components/ai-monitor/EnhancedAnalyticsTab';
import AILearningDashboard from '@/components/ai-monitor/AILearningDashboard';
import SettingsTab from '@/components/ai-monitor/SettingsTab';
import { MessageSquare, Calendar, Clock, Activity, BarChart3, Brain, Settings } from 'lucide-react';

const AIMessageMonitor = () => {
  const [activeTab, setActiveTab] = useState('queue');

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7 mb-6">
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            AI Queue
          </TabsTrigger>
          <TabsTrigger value="learning" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Learning
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Calendar
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

        <TabsContent value="queue">
          <EnhancedAIQueueTab />
        </TabsContent>

        <TabsContent value="learning">
          <AILearningDashboard />
        </TabsContent>

        <TabsContent value="schedule">
          <MessageScheduleOverview />
        </TabsContent>

        <TabsContent value="calendar">
          <MessageQueueCalendar />
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

export default AIMessageMonitor;
