
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AIQueueTab from './AIQueueTab';
import MessageApprovalQueue from './MessageApprovalQueue';
import EmergencyFixesStatus from './EmergencyFixesStatus';
import MessageQueueDashboard from './MessageQueueDashboard';
import QualityMetricsPanel from './QualityMetricsPanel';
import Phase3Dashboard from './Phase3Dashboard';
import { 
  Activity, 
  CheckSquare, 
  AlertTriangle, 
  Clock,
  Award,
  TrendingUp,
  Brain,
  Zap
} from 'lucide-react';

const EnhancedAIMonitorTabs = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Enhanced AI Monitor Dashboard</h1>
        <p className="text-gray-600 mt-1">Advanced AI messaging system with intelligent learning and automation</p>
      </div>

      <Tabs defaultValue="phase3" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="phase3" className="flex items-center space-x-2">
            <Brain className="h-4 w-4" />
            <span>AI Intelligence</span>
          </TabsTrigger>
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
            <span>Smart Schedule</span>
          </TabsTrigger>
          <TabsTrigger value="quality" className="flex items-center space-x-2">
            <Award className="h-4 w-4" />
            <span>Quality Metrics</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="legacy" className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Legacy Queue</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="phase3" className="mt-6">
          <Phase3Dashboard />
        </TabsContent>

        <TabsContent value="health" className="mt-6">
          <EmergencyFixesStatus />
        </TabsContent>

        <TabsContent value="approval" className="mt-6">
          <MessageApprovalQueue />
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <MessageQueueDashboard />
        </TabsContent>

        <TabsContent value="quality" className="mt-6">
          <QualityMetricsPanel />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="text-center py-12">
            <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Legacy Analytics</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Basic analytics features. For advanced analytics with AI insights, 
              predictive modeling, and real-time learning, check the AI Intelligence tab.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="legacy" className="mt-6">
          <AIQueueTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedAIMonitorTabs;
