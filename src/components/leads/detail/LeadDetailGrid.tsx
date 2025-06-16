
import React from "react";
import LeadDetailHeader from "./LeadDetailHeader";
import LeadInfoCardsSection from "./LeadInfoCardsSection";
import LeadDetailTabsSection from "./LeadDetailTabsSection";
import type { LeadDetailData } from "@/services/leadDetailService";
import type { MessageData } from "@/types/conversation";

interface LeadDetailGridProps {
  lead: LeadDetailData;
  phoneNumbers: any[];
  primaryPhone: string;
  messages: MessageData[];
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
  // Transform lead for header component
  const headerLead = {
    id: lead.id,
    first_name: lead.firstName,
    last_name: lead.lastName,
    email: lead.email,
    status: lead.status,
    vehicle_interest: lead.vehicleInterest,
    city: lead.city,
    state: lead.state,
    created_at: lead.createdAt
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Lead Info */}
        <div className="lg:col-span-1">
          <div className="space-y-6">
            <LeadDetailHeader lead={headerLead} />
            <LeadInfoCardsSection 
              lead={lead} 
              phoneNumbers={phoneNumbers}
              primaryPhone={primaryPhone}
              onPhoneSelect={onPhoneSelect}
            />
          </div>
        </div>

        {/* Right Column - Tabs */}
        <div className="lg:col-span-2">
          <LeadDetailTabsSection
            lead={lead}
            messages={messages}
            messagesLoading={messagesLoading}
            onSendMessage={onSendMessage}
          />
        </div>
      </div>
    </div>
  );
};

export default LeadDetailGrid;
