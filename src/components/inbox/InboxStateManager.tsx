
import React, { useState, useCallback } from 'react';

interface InboxState {
  selectedLead: string | null;
  showMemory: boolean;
  showTemplates: boolean;
  isInitialized: boolean;
}

interface InboxStateManagerProps {
  children: (state: InboxState & {
    setSelectedLead: (leadId: string | null) => void;
    setShowMemory: (show: boolean) => void;
    setShowTemplates: (show: boolean) => void;
    setIsInitialized: (initialized: boolean) => void;
    handleToggleMemory: () => void;
    handleToggleTemplates: () => void;
  }) => React.ReactNode;
}

const InboxStateManager: React.FC<InboxStateManagerProps> = ({ children }) => {
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [showMemory, setShowMemory] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const handleToggleMemory = useCallback(() => {
    setShowMemory(prev => !prev);
  }, []);

  const handleToggleTemplates = useCallback(() => {
    setShowTemplates(prev => !prev);
  }, []);

  return (
    <>
      {children({
        selectedLead,
        showMemory,
        showTemplates,
        isInitialized,
        setSelectedLead,
        setShowMemory,
        setShowTemplates,
        setIsInitialized,
        handleToggleMemory,
        handleToggleTemplates
      })}
    </>
  );
};

export default InboxStateManager;
