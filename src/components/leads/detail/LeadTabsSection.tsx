import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LeadMessaging from '@/components/leads/LeadMessaging';
import EmailTab from './EmailTab';
import ActivityTimelineComponent from './ActivityTimelineComponent';
import EnhancedAIControls from './EnhancedAIControls';
import { LeadDetailData } from '@/services/leadDetailService';
import VehicleRecommendationsTab from './VehicleRecommendationsTab';
import LeadScoringCard from '../LeadScoringCard';
import ChurnPredictionCard from '../ChurnPredictionCard';

interface LeadTabsSectionProps {
  lead: LeadDetailData;
}

const LeadTabsSection = ({ lead }: LeadTabsSectionProps) => {
  // Sample activities data - in a real implementation, this would come from a hook or service
  const sampleActivities = [
    {
      id: '1',
      type: 'lead_created',
      description: 'Lead was created',
      timestamp: new Date().toISOString(),
    },
    {
      id: '2', 
      type: 'message_sent',
      description: 'Welcome message sent',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    }
  ];

  const handleAIOptInChange = async (enabled: boolean) => {
    // TODO: Implement AI opt-in change logic
    console.log('AI opt-in changed:', enabled);
  };

  return (
    <Tabs defaultValue="messaging" className="w-full">
      <TabsList className="grid w-full grid-cols-6">
        <TabsTrigger value="messaging">Messaging</TabsTrigger>
        <TabsTrigger value="ai-recommendations">AI Matches</TabsTrigger>
        <TabsTrigger value="scoring">Lead Score</TabsTrigger>
        <TabsTrigger value="churn">Churn Risk</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="ai-automation">AI Automation</TabsTrigger>
      </TabsList>

      <TabsContent value="messaging" className="mt-6">
        <LeadMessaging leadId={lead.id} />
      </TabsContent>

      <TabsContent value="ai-recommendations" className="mt-6">
        <VehicleRecommendationsTab lead={lead} />
      </TabsContent>

      <TabsContent value="scoring" className="mt-6">
        <LeadScoringCard leadId={lead.id} />
      </TabsContent>

      <TabsContent value="churn" className="mt-6">
        <ChurnPredictionCard leadId={lead.id} />
      </TabsContent>

      <TabsContent value="activity" className="mt-6">
        <ActivityTimelineComponent activities={sampleActivities} />
      </TabsContent>

      <TabsContent value="ai-automation" className="mt-6">
        <EnhancedAIControls 
          leadId={lead.id}
          aiOptIn={lead.aiOptIn || false}
          onAIOptInChange={handleAIOptInChange}
        />
      </TabsContent>
    </Tabs>
  );
};

export default LeadTabsSection;
