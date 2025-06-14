
import React from 'react';
import ContactInfoCard from './ContactInfoCard';
import VehicleInfoCard from './VehicleInfoCard';
import QuickContactCard from './QuickContactCard';
import LeadSummaryCard from './LeadSummaryCard';
import AIAutomationCard from './AIAutomationCard';
import CommunicationPrefsCard from './CommunicationPrefsCard';
import { LeadDetailData } from '@/services/leadDetailService';
import { PhoneNumber } from '@/types/lead';

interface LeadInfoCardsSectionProps {
  transformedLead: LeadDetailData;
  phoneNumbers: PhoneNumber[];
  primaryPhone: string;
  onPhoneSelect: (phoneNumber: string) => void;
}

const LeadInfoCardsSection = ({ 
  transformedLead, 
  phoneNumbers, 
  primaryPhone, 
  onPhoneSelect 
}: LeadInfoCardsSectionProps) => {
  return (
    <div className="lg:col-span-1 space-y-6">
      <ContactInfoCard 
        lead={transformedLead}
        phoneNumbers={phoneNumbers}
        primaryPhone={primaryPhone}
        onPhoneSelect={onPhoneSelect}
      />
      <VehicleInfoCard lead={transformedLead} />
      <QuickContactCard 
        phoneNumbers={phoneNumbers}
        primaryPhone={primaryPhone}
        onPhoneSelect={onPhoneSelect}
      />
      <LeadSummaryCard lead={transformedLead} />
      <AIAutomationCard lead={transformedLead} />
      <CommunicationPrefsCard lead={transformedLead} />
    </div>
  );
};

export default LeadInfoCardsSection;
