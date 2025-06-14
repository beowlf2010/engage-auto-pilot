
import React from 'react';
import EmailConversationsList from '../../email/EmailConversationsList';

interface EmailTabProps {
  leadId: string;
}

const EmailTab = ({ leadId }: EmailTabProps) => {
  return (
    <div className="space-y-6">
      <EmailConversationsList leadId={leadId} />
    </div>
  );
};

export default EmailTab;
