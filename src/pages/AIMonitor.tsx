
import React from 'react';
import AutomatedAIMonitorTabs from '@/components/ai-monitor/AutomatedAIMonitorTabs';
import { AutomationMonitor } from '@/components/ai/AutomationMonitor';
import { AIAutomationTester } from '@/components/debug/AIAutomationTester';
import { AIAutomationControlDashboard } from '@/components/AIAutomationControlDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AIMonitor = () => {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">AI Automation Monitor</h1>
      <Tabs defaultValue="control" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="control">Control Dashboard</TabsTrigger>
          <TabsTrigger value="automation">Automation Status</TabsTrigger>
          <TabsTrigger value="monitor">Conversation Monitor</TabsTrigger>
          <TabsTrigger value="debug">Debug Tester</TabsTrigger>
        </TabsList>
        <TabsContent value="control">
          <AIAutomationControlDashboard />
        </TabsContent>
        <TabsContent value="automation">
          <AutomationMonitor />
        </TabsContent>
        <TabsContent value="monitor">
          <AutomatedAIMonitorTabs />
        </TabsContent>
        <TabsContent value="debug">
          <div className="flex justify-center">
            <AIAutomationTester />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIMonitor;
