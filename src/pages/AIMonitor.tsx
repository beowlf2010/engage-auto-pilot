
import React from 'react';
import AutomatedAIMonitorTabs from '@/components/ai-monitor/AutomatedAIMonitorTabs';
import { AutomationMonitor } from '@/components/ai/AutomationMonitor';
import { AIAutomationTester } from '@/components/debug/AIAutomationTester';
import { AIAutomationControlDashboard } from '@/components/AIAutomationControlDashboard';
import { AISystemTest } from '@/components/ai/AISystemTest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SMSPipelineHealthMonitor } from '@/components/ai-monitor/SMSPipelineHealthMonitor';
import LeadStatusFixPanel from '@/components/ai-monitor/LeadStatusFixPanel';

const AIMonitor = () => {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">AI Automation Monitor</h1>
      <Tabs defaultValue="control" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="control">Control Dashboard</TabsTrigger>
          <TabsTrigger value="automation">Automation Status</TabsTrigger>
          <TabsTrigger value="sms">SMS Pipeline</TabsTrigger>
          <TabsTrigger value="fixes">Lead Fixes</TabsTrigger>
          <TabsTrigger value="monitor">Conversation Monitor</TabsTrigger>
          <TabsTrigger value="debug">Debug Tester</TabsTrigger>
          <TabsTrigger value="test">AI System Test</TabsTrigger>
        </TabsList>
        <TabsContent value="control">
          <AIAutomationControlDashboard />
        </TabsContent>
        <TabsContent value="automation">
          <AutomationMonitor />
        </TabsContent>
        <TabsContent value="sms">
          <SMSPipelineHealthMonitor />
        </TabsContent>
        <TabsContent value="fixes">
          <LeadStatusFixPanel />
        </TabsContent>
        <TabsContent value="monitor">
          <AutomatedAIMonitorTabs />
        </TabsContent>
        <TabsContent value="debug">
          <div className="flex justify-center">
            <AIAutomationTester />
          </div>
        </TabsContent>
        <TabsContent value="test">
          <AISystemTest />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIMonitor;
