
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EnhancedMessageThread from "./EnhancedMessageThread";
import ActivityTimelineComponent from "./ActivityTimelineComponent";
import EmailTab from "./EmailTab";
import type { MessageData } from "@/types/conversation";
import type { LeadDetailData } from "@/services/leadDetailService";

interface LeadDetailTabsSectionProps {
  lead: LeadDetailData;
  messages: MessageData[];
  messagesLoading: boolean;
  onSendMessage: (message: string) => Promise<void>;
}

const LeadDetailTabsSection: React.FC<LeadDetailTabsSectionProps> = ({
  lead,
  messages,
  messagesLoading,
  onSendMessage
}) => {
  return (
    <Tabs defaultValue="messages" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="messages">Messages</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="email">Email</TabsTrigger>
      </TabsList>

      <TabsContent value="messages" className="space-y-4">
        <div className="h-[600px]">
          <EnhancedMessageThread
            messages={messages}
            onSendMessage={onSendMessage}
            isLoading={messagesLoading}
            leadName={`${lead.firstName} ${lead.lastName}`}
            disabled={false}
          />
        </div>
      </TabsContent>

      <TabsContent value="activity" className="space-y-0">
        <div className="h-[600px]">
          <ActivityTimelineComponent
            activities={lead.activityTimeline}
          />
        </div>
      </TabsContent>

      <TabsContent value="email" className="space-y-0">
        <div className="h-[600px]">
          <EmailTab 
            leadId={lead.id}
            leadEmail={lead.email}
            leadFirstName={lead.firstName}
            leadLastName={lead.lastName}
            vehicleInterest={lead.vehicleInterest}
          />
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default LeadDetailTabsSection;
