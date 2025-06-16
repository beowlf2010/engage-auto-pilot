
import React, { useState } from "react";
import { User, Car, Bot, MessageSquare, ExpandIcon, ShrinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import CollapsibleCard from "./CollapsibleCard";
import LeadSummaryCard from "./LeadSummaryCard";
import ContactInfoCard from "./ContactInfoCard";
import VehicleInfoCard from "./VehicleInfoCard";
import EnhancedPhoneManager from "./EnhancedPhoneManager";
import EnhancedAIControls from "./EnhancedAIControls";
import CommunicationPrefsCard from "./CommunicationPrefsCard";
import type { LeadDetailData } from "@/services/leadDetailService";
import type { PhoneNumber } from "@/types/lead";

interface LeadInfoCardsSectionProps {
  lead: LeadDetailData;
  phoneNumbers: PhoneNumber[];
  primaryPhone: string;
  onPhoneSelect: (phone: any) => void;
}

const LeadInfoCardsSection: React.FC<LeadInfoCardsSectionProps> = ({
  lead,
  phoneNumbers,
  primaryPhone,
  onPhoneSelect
}) => {
  const [expandAll, setExpandAll] = useState(false);

  const handleAIOptInChange = async (enabled: boolean): Promise<void> => {
    console.log("AI opt-in changed:", enabled);
    // Implementation would update the lead's AI opt-in status
  };

  const toggleExpandAll = () => {
    setExpandAll(!expandAll);
  };

  const getContactSummary = () => {
    return primaryPhone || lead.email || "No contact info";
  };

  const getVehicleSummary = () => {
    return lead.vehicleInterest || "No vehicle specified";
  };

  const getAISummary = () => {
    return lead.aiOptIn ? "Active" : "Inactive";
  };

  const getCommunicationSummary = () => {
    const restrictions = [];
    if (lead.doNotCall) restrictions.push("No calls");
    if (lead.doNotEmail) restrictions.push("No emails");
    if (lead.doNotMail) restrictions.push("No mail");
    return restrictions.length > 0 ? restrictions.join(", ") : "All allowed";
  };

  return (
    <div className="space-y-4">
      {/* Expand/Collapse All Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleExpandAll}
          className="text-xs"
        >
          {expandAll ? (
            <>
              <ShrinkIcon className="w-3 h-3 mr-1" />
              Collapse All
            </>
          ) : (
            <>
              <ExpandIcon className="w-3 h-3 mr-1" />
              Expand All
            </>
          )}
        </Button>
      </div>

      {/* Contact Information - Expanded by default */}
      <CollapsibleCard
        title="Contact Information"
        icon={<User className="w-4 h-4" />}
        defaultOpen={!expandAll ? true : expandAll}
        summary={getContactSummary()}
      >
        <div className="space-y-4">
          <LeadSummaryCard lead={lead} />
          <ContactInfoCard 
            lead={lead}
            phoneNumbers={phoneNumbers}
            primaryPhone={primaryPhone}
            onPhoneSelect={onPhoneSelect}
          />
          <EnhancedPhoneManager 
            phoneNumbers={phoneNumbers}
            onPhoneSelect={onPhoneSelect}
          />
        </div>
      </CollapsibleCard>

      {/* Vehicle Details */}
      <CollapsibleCard
        title="Vehicle Details"
        icon={<Car className="w-4 h-4" />}
        defaultOpen={expandAll}
        summary={getVehicleSummary()}
      >
        <VehicleInfoCard lead={lead} />
      </CollapsibleCard>

      {/* AI Automation */}
      <CollapsibleCard
        title="AI Automation"
        icon={<Bot className="w-4 h-4" />}
        defaultOpen={expandAll}
        badge={lead.aiOptIn ? "Active" : "Inactive"}
        badgeVariant={lead.aiOptIn ? "default" : "secondary"}
        summary={getAISummary()}
      >
        <EnhancedAIControls
          leadId={lead.id}
          aiOptIn={lead.aiOptIn}
          aiStage={lead.aiStage}
          nextAiSendAt={lead.nextAiSendAt}
          onAIOptInChange={handleAIOptInChange}
        />
      </CollapsibleCard>

      {/* Communication Preferences */}
      <CollapsibleCard
        title="Communication"
        icon={<MessageSquare className="w-4 h-4" />}
        defaultOpen={expandAll}
        summary={getCommunicationSummary()}
      >
        <CommunicationPrefsCard lead={lead} />
      </CollapsibleCard>
    </div>
  );
};

export default LeadInfoCardsSection;
