
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AIQueueTab from './AIQueueTab';
import MessageApprovalQueue from './MessageApprovalQueue';
import EmergencyFixesStatus from './EmergencyFixesStatus';
import MessageQueueDashboard from './MessageQueueDashboard';
import { 
  Activity, 
  CheckSquare, 
  AlertTriangle, 
  Clock 
} from 'lucide-react';

const EnhancedAIMonitorTabs = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI Monitor Dashboard</h1>
        <p className="text-gray-600 mt-1">Monitor and manage AI messaging system</p>
      </div>

      <Tabs defaultValue="health" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="health" className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>System Health</span>
          </TabsTrigger>
          <TabsTrigger value="approval" className="flex items-center space-x-2">
            <CheckSquare className="h-4 w-4" />
            <span>Approval Queue</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Message Schedule</span>
          </TabsTrigger>
          <TabsTrigger value="legacy" className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Legacy Queue</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="mt-6">
          <EmergencyFixesStatus />
        </TabsContent>

        <TabsContent value="approval" className="mt-6">
          <MessageApprovalQueue />
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <MessageQueueDashboard />
        </TabsContent>

        <TabsContent value="legacy" className="mt-6">
          <AIQueueTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedAIMonitorTabs;
