
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PersonalizationDashboard from './PersonalizationDashboard';
import BehavioralTriggersPanel from './BehavioralTriggersPanel';
import { Brain, Activity, MessageSquare, TrendingUp } from 'lucide-react';

const EnhancedPersonalizationDashboard = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Enhanced Personalization</h1>
        <p className="text-gray-600">
          AI-driven personalization insights, behavioral triggers, and optimal contact timing
        </p>
      </div>

      <Tabs defaultValue="personality" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personality" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Personality
          </TabsTrigger>
          <TabsTrigger value="triggers" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Behavioral Triggers
          </TabsTrigger>
          <TabsTrigger value="messaging" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Message Templates
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personality" className="mt-6">
          <PersonalizationDashboard />
        </TabsContent>

        <TabsContent value="triggers" className="mt-6">
          <BehavioralTriggersPanel />
        </TabsContent>

        <TabsContent value="messaging" className="mt-6">
          <div className="text-center py-12 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Dynamic Message Templates</h3>
            <p>AI-generated message templates based on personality analysis coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="text-center py-12 text-gray-500">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Personalization Analytics</h3>
            <p>Advanced analytics on personalization effectiveness coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedPersonalizationDashboard;
