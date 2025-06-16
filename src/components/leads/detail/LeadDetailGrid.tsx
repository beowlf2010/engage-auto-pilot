
import React from "react";
import { Card } from "@/components/ui/card";
import LeadSummaryCard from "./LeadSummaryCard";
import ContactInfoCard from "./ContactInfoCard";
import VehicleInfoCard from "./VehicleInfoCard";
import QuickControlsCard from "./QuickControlsCard";
import QuickEmailActions from "./QuickEmailActions";
import LeadDetailTabsSection from "./LeadDetailTabsSection";

interface LeadDetailGridProps {
  lead: any;
  phoneNumbers: any[];
  primaryPhone: string;
  messages: any[];
  messagesLoading: boolean;
  onPhoneSelect: (phone: any) => void;
  onSendMessage: (message: string) => Promise<void>;
}

const LeadDetailGrid: React.FC<LeadDetailGridProps> = ({
  lead,
  phoneNumbers,
  primaryPhone,
  messages,
  messagesLoading,
  onPhoneSelect,
  onSendMessage
}) => {
  const handleAIOptInChange = async (enabled: boolean): Promise<void> => {
    console.log("AI opt-in changed:", enabled);
    // TODO: Implementation would update the lead's AI opt-in status
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Lead Info */}
        <div className="lg:col-span-1 space-y-6">
          <LeadSummaryCard lead={lead} />
          <ContactInfoCard 
            lead={lead} 
            phoneNumbers={phoneNumbers}
            onPhoneSelect={onPhoneSelect}
          />
          <VehicleInfoCard lead={lead} />
          <QuickControlsCard
            leadId={lead.id}
            aiOptIn={lead.aiOptIn || false}
            onAIOptInChange={handleAIOptInChange}
          />
          <QuickEmailActions
            leadId={lead.id}
            leadEmail={lead.email}
            leadFirstName={lead.firstName}
            leadLastName={lead.lastName}
            vehicleInterest={lead.vehicleInterest}
          />
        </div>

        {/* Right Column - Tabs */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <LeadDetailTabsSection
              lead={lead}
              messages={messages}
              messagesLoading={messagesLoading}
              onSendMessage={onSendMessage}
            />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LeadDetailGrid;
