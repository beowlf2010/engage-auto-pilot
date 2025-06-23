
import React from 'react';
import SmartInboxWithEnhancedAI from './SmartInboxWithEnhancedAI';

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

const SmartInboxMain: React.FC<SmartInboxMainProps> = ({ onLeadsRefresh, user, ...otherProps }) => {
  // Pass only the props that SmartInboxWithEnhancedAI actually needs
  return <SmartInboxWithEnhancedAI onLeadsRefresh={onLeadsRefresh} />;
};

export default SmartInboxMain;
