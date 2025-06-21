
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AutomationControlPanel from './AutomationControlPanel';
import EnhancedAIQueueTab from './EnhancedAIQueueTab';
import MessageScheduleOverview from './MessageScheduleOverview';
import MessageQueueCalendar from './MessageQueueCalendar';
import RecentActivityTab from './RecentActivityTab';
import EnhancedAnalyticsTab from './EnhancedAnalyticsTab';
import { 
  Activity, 
  MessageSquare, 
  Clock, 
  Calendar, 
  TrendingUp, 
  BarChart3 
} from 'lucide-react';

const AutomatedAIMonitorTabs = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-6 border-b">
        <div>
          <h1 className="text-2xl font-bold">Automated AI Message System</h1>
          <p className="text-muted-foreground">
            Fully automated AI messaging with real-time monitoring and controls
          </p>
        </div>
      </div>

      <Tabs defaultValue="automation" className="p-6">
        <TabsList className="grid w-full grid-cols-6 mb-6">
          <TabsTrigger value="automation" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Automation
          </TabsTrigger>
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Queue Monitor
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
            <TrendingUp className="w-4 h-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="automation">
          <AutomationControlPanel />
        </TabsContent>

        <TabsContent value="queue">
          <EnhancedAIQueueTab />
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
      </Tabs>
    </div>
  );
};

export default AutomatedAIMonitorTabs;
