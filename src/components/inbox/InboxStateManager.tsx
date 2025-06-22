
import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface InboxState {
  selectedLead: string | null;
  showMemory: boolean;
  showTemplates: boolean;
  isInitialized: boolean;
  selectedConversation: any | null;
}

interface InboxStateContextType extends InboxState {
  setSelectedLead: (leadId: string) => void;
  setShowMemory: (show: boolean) => void;
  setShowTemplates: (show: boolean) => void;
  setIsInitialized: (initialized: boolean) => void;
  handleToggleMemory: () => void;
  handleToggleTemplates: () => void;
}

const InboxStateContext = createContext<InboxStateContextType | undefined>(undefined);

export const useInboxState = () => {
  const context = useContext(InboxStateContext);
  if (context === undefined) {
    throw new Error('useInboxState must be used within an InboxStateProvider');
  }
  return context;
};

interface InboxStateManagerProps {
  children: (state: InboxStateContextType) => ReactNode;
}

const InboxStateManager: React.FC<InboxStateManagerProps> = ({ children }) => {
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [showMemory, setShowMemory] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);

  const handleToggleMemory = () => {
    setShowMemory(!showMemory);
  };

  const handleToggleTemplates = () => {
    setShowTemplates(!showTemplates);
  };

  // Update selected conversation when lead changes
  const handleSetSelectedLead = (leadId: string) => {
    setSelectedLead(leadId);
    // Mock conversation object for compatibility
    setSelectedConversation({
      leadId,
      leadName: 'Loading...'
    });
  };

  const contextValue: InboxStateContextType = {
    selectedLead,
    showMemory,
    showTemplates,
    isInitialized,
    selectedConversation,
    setSelectedLead: handleSetSelectedLead,
    setShowMemory,
    setShowTemplates,
    setIsInitialized,
    handleToggleMemory,
    handleToggleTemplates
  };

  return (
    <InboxStateContext.Provider value={contextValue}>
      {children(contextValue)}
    </InboxStateContext.Provider>
  );
};

export default InboxStateManager;
