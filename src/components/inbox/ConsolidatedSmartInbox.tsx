
import React from 'react';
import SmartInboxWithEnhancedAI from './SmartInboxWithEnhancedAI';

interface ConsolidatedSmartInboxProps {
  onLeadsRefresh: () => void;
}

const ConsolidatedSmartInbox: React.FC<ConsolidatedSmartInboxProps> = ({
  onLeadsRefresh
}) => {
  return <SmartInboxWithEnhancedAI />;
};

export default ConsolidatedSmartInbox;
