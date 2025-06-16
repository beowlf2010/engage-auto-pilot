
import React, { useState } from "react";
import { User, Car, MessageSquare, ExpandIcon, ShrinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import CollapsibleCard from "./CollapsibleCard";
import LeadSummaryCard from "./LeadSummaryCard";
import ContactInfoCard from "./ContactInfoCard";
import VehicleInfoCard from "./VehicleInfoCard";
import EnhancedPhoneManager from "./EnhancedPhoneManager";
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
  const [cardStates, setCardStates] = useState({
    contact: true, // Contact info expanded by default
    vehicle: false,
    communication: false
  });

  const toggleExpandAll = () => {
    const newExpandAll = !expandAll;
    setExpandAll(newExpandAll);
    
    // Update all card states
    setCardStates({
      contact: newExpandAll,
      vehicle: newExpandAll,
      communication: newExpandAll
    });
  };

  const handleCardToggle = (cardKey: string, isOpen: boolean) => {
    setCardStates(prev => ({
      ...prev,
      [cardKey]: isOpen
    }));
    
    // If any card is manually toggled, disable the global expand all state
    setExpandAll(false);
  };

  const getContactSummary = () => {
    return primaryPhone || lead.email || "No contact info";
  };

  const getVehicleSummary = () => {
    return lead.vehicleInterest || "No vehicle specified";
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

      {/* Contact Information */}
      <CollapsibleCard
        title="Contact Information"
        icon={<User className="w-4 h-4" />}
        isOpen={cardStates.contact}
        onOpenChange={(open) => handleCardToggle('contact', open)}
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
        isOpen={cardStates.vehicle}
        onOpenChange={(open) => handleCardToggle('vehicle', open)}
        summary={getVehicleSummary()}
      >
        <VehicleInfoCard lead={lead} />
      </CollapsibleCard>

      {/* Communication Preferences */}
      <CollapsibleCard
        title="Communication Preferences"
        icon={<MessageSquare className="w-4 h-4" />}
        isOpen={cardStates.communication}
        onOpenChange={(open) => handleCardToggle('communication', open)}
        summary={getCommunicationSummary()}
      >
        <CommunicationPrefsCard lead={lead} />
      </CollapsibleCard>
    </div>
  );
};

export default LeadInfoCardsSection;
