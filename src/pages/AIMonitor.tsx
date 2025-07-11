
import React from 'react';
import AutomatedAIMonitorTabs from '@/components/ai-monitor/AutomatedAIMonitorTabs';
import { AutomationMonitor } from '@/components/ai/AutomationMonitor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AIMonitor = () => {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">AI Automation Monitor</h1>
      <Tabs defaultValue="automation" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="automation">Automation Status</TabsTrigger>
          <TabsTrigger value="monitor">Conversation Monitor</TabsTrigger>
        </TabsList>
        <TabsContent value="automation">
          <AutomationMonitor />
        </TabsContent>
        <TabsContent value="monitor">
          <AutomatedAIMonitorTabs />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIMonitor;
