
import React from 'react';
import LeadDetailHeader from "./LeadDetailHeader";
import LeadInfoCardsSection from "./LeadInfoCardsSection";
import LeadTabsSection from "./LeadTabsSection";
import { LeadDetailData } from '@/services/leadDetailService';
import { PhoneNumber } from '@/types/lead';

interface MessageThreadLead {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  ai_stage: string;
  next_ai_send_at: string | null;
  last_reply_at: string | null;
  ai_opt_in: boolean;
}

interface LeadDetailLayoutProps {
  lead: any;
  transformedLead: LeadDetailData;
  messageThreadLead: MessageThreadLead;
  phoneNumbers: PhoneNumber[];
  primaryPhone: string;
  showMessageComposer: boolean;
  setShowMessageComposer: (show: boolean) => void;
  onPhoneSelect: (phoneNumber: string) => void;
}

const LeadDetailLayout = ({
  lead,
  transformedLead,
  messageThreadLead,
  phoneNumbers,
  primaryPhone,
  showMessageComposer,
  setShowMessageComposer,
  onPhoneSelect
}: LeadDetailLayoutProps) => {
  return (
    <div className="space-y-6">
      <LeadDetailHeader 
        lead={lead}
        onSendMessage={() => setShowMessageComposer(true)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <LeadInfoCardsSection
          transformedLead={transformedLead}
          phoneNumbers={phoneNumbers}
          primaryPhone={primaryPhone}
          onPhoneSelect={onPhoneSelect}
        />

        <LeadTabsSection
          transformedLead={transformedLead}
          messageThreadLead={messageThreadLead}
          leadId={lead.id}
          showMessageComposer={showMessageComposer}
          setShowMessageComposer={setShowMessageComposer}
        />
      </div>
    </div>
  );
};

export default LeadDetailLayout;
