
import React from 'react';
import SmartInboxWithAILearning from './SmartInboxWithAILearning';

interface SmartInboxMainProps {
  onLeadsRefresh?: () => void;
  user?: {
    role: string;
    id: string;
  };
  conversations?: any[];
  messages?: any[];
  sendingMessage?: boolean;
  loading?: boolean;
  loadMessages?: (leadId: string) => Promise<void>;
  sendMessage?: (leadId: string, message: string) => Promise<void>;
  setError?: (error: string | null) => void;
  debugPanelOpen?: boolean;
  setDebugPanelOpen?: (open: boolean) => void;
  markAsRead?: (leadId: string) => Promise<void>;
  markingAsRead?: string | null;
  getLeadIdFromUrl?: () => string | null;
  [key: string]: any; // Allow additional props to pass through
}

const SmartInboxMain: React.FC<SmartInboxMainProps> = ({ user, ...otherProps }) => {
  // If user is not provided, create a mock user to prevent crashes
  const safeUser = user || { role: 'admin', id: 'mock-user' };
  
  // Pass through to the full-featured AI learning component instead of the basic one
  return <SmartInboxWithAILearning user={safeUser} {...otherProps} />;
};

export default SmartInboxMain;
