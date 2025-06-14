
import React from "react";
import LeadSummaryCard from "./LeadSummaryCard";
import ContactInfoCard from "./ContactInfoCard";
import VehicleInfoCard from "./VehicleInfoCard";
import EnhancedPhoneManager from "./EnhancedPhoneManager";
import EnhancedAIControls from "./EnhancedAIControls";
import CommunicationPrefsCard from "./CommunicationPrefsCard";
import type { LeadDetailData } from "@/services/leadDetailService";

interface LeadInfoCardsSectionProps {
  lead: LeadDetailData;
  phoneNumbers: any[];
  onPhoneSelect: (phone: any) => void;
}

const LeadInfoCardsSection: React.FC<LeadInfoCardsSectionProps> = ({
  lead,
  phoneNumbers,
  onPhoneSelect
}) => {
  const handleAIOptInChange = async (enabled: boolean): Promise<void> => {
    console.log("AI opt-in changed:", enabled);
    // Implementation would update the lead's AI opt-in status
  };

  return (
    <div className="space-y-6">
      <LeadSummaryCard lead={lead} />
      <ContactInfoCard lead={lead} />
      <EnhancedPhoneManager 
        phoneNumbers={phoneNumbers}
        onPhoneSelect={onPhoneSelect}
      />
      <VehicleInfoCard lead={lead} />
      <EnhancedAIControls
        leadId={lead.id}
        aiOptIn={lead.aiOptIn}
        aiStage={lead.aiStage}
        nextAiSendAt={lead.nextAiSendAt}
        onAIOptInChange={handleAIOptInChange}
      />
      <CommunicationPrefsCard lead={lead} />
    </div>
  );
};

export default LeadInfoCardsSection;
