
import React from 'react';
import SmartInboxWithEnhancedAI from './SmartInboxWithEnhancedAI';

interface SmartInboxMainProps {
  onLeadsRefresh?: () => void;
  user?: {
    role: string;
    id: string;
  };
}

const SmartInboxMain: React.FC<SmartInboxMainProps> = ({ onLeadsRefresh, user }) => {
  return <SmartInboxWithEnhancedAI onLeadsRefresh={onLeadsRefresh} />;
};

export default SmartInboxMain;
