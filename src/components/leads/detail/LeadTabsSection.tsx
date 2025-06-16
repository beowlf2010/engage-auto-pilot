import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LeadMessaging from '@/components/leads/LeadMessaging';
import EmailTab from '@/components/leads/EmailTab';
import ActivityTimelineComponent from '@/components/leads/ActivityTimelineComponent';
import EnhancedAIControls from '@/components/leads/EnhancedAIControls';
import { LeadDetailData } from '@/services/leadDetailService';

interface LeadTabsSectionProps {
  lead: LeadDetailData;
}

import VehicleRecommendationsTab from './VehicleRecommendationsTab';

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
