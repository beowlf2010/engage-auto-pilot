
import React from 'react';
import EnhancedEmailTab from './EnhancedEmailTab';

interface EmailTabProps {
  leadId: string;
  leadEmail?: string;
  leadFirstName?: string;
  leadLastName?: string;
  vehicleInterest?: string;
}

const EmailTab: React.FC<EmailTabProps> = (props) => {
  return <EnhancedEmailTab {...props} />;
};

export default EmailTab;
