
import React from 'react';
import SmartInboxWithEnhancedAI from './SmartInboxWithEnhancedAI';

interface SmartInboxMainProps {
  onLeadsRefresh?: () => void;
}

const SmartInboxMain: React.FC<SmartInboxMainProps> = ({ onLeadsRefresh }) => {
  return <SmartInboxWithEnhancedAI onLeadsRefresh={onLeadsRefresh} />;
};

export default SmartInboxMain;
