
import React from 'react';
import SmartInboxWithEnhancedAI from './SmartInboxWithEnhancedAI';

interface SmartInboxWithAILearningProps {
  user?: {
    role: string;
    id: string;
  };
  onLeadsRefresh?: () => void;
  [key: string]: any;
}

// This component is a wrapper that redirects to the enhanced AI component
const SmartInboxWithAILearning: React.FC<SmartInboxWithAILearningProps> = ({ 
  user, 
  onLeadsRefresh,
  ...otherProps 
}) => {
  console.log('🔄 [AI LEARNING WRAPPER] Redirecting to SmartInboxWithEnhancedAI with user:', user);
  
  return <SmartInboxWithEnhancedAI onLeadsRefresh={onLeadsRefresh} {...otherProps} />;
};

export default SmartInboxWithAILearning;
