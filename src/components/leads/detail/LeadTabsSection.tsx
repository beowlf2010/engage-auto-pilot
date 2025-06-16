
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LeadMessaging from '@/components/leads/LeadMessaging';
import EmailTab from './EmailTab';
import ActivityTimelineComponent from './ActivityTimelineComponent';
import EnhancedAIControls from './EnhancedAIControls';
import { LeadDetailData } from '@/services/leadDetailService';
import VehicleRecommendationsTab from './VehicleRecommendationsTab';

interface LeadTabsSectionProps {
  lead: LeadDetailData;
}

const LeadTabsSection = ({ lead }: LeadTabsSectionProps) => {
  return (
    <Tabs defaultValue="messaging" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="messaging">Messaging</TabsTrigger>
        <TabsTrigger value="email">Email</TabsTrigger>
        <TabsTrigger value="ai-recommendations">AI Matches</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="ai-automation">AI Automation</TabsTrigger>
      </TabsList>

      <TabsContent value="messaging" className="mt-6">
        <LeadMessaging leadId={lead.id} />
      </TabsContent>

      <TabsContent value="email" className="mt-6">
        <EmailTab leadId={lead.id} />
      </TabsContent>

      <TabsContent value="ai-recommendations" className="mt-6">
        <VehicleRecommendationsTab lead={lead} />
      </TabsContent>

      <TabsContent value="activity" className="mt-6">
        <ActivityTimelineComponent leadId={lead.id} />
      </TabsContent>

      <TabsContent value="ai-automation" className="mt-6">
        <EnhancedAIControls leadId={lead.id} />
      </TabsContent>
    </Tabs>
  );
};

export default LeadTabsSection;
