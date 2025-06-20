
import React, { useState, useEffect } from 'react';
import { DialogTrigger } from '@/components/ui/dialog';
import { Lead } from '@/types/lead';
import EnhancedAIPreview from './EnhancedAIPreview';

interface AIPreviewPopoutProps {
  lead: Lead;
  onAIOptInChange: (leadId: string, value: boolean) => void;
  children: React.ReactNode;
}

const AIPreviewPopout: React.FC<AIPreviewPopoutProps> = ({
  lead,
  onAIOptInChange,
  children
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleAIEnabled = () => {
    onAIOptInChange(lead.id, true);
  };

  return (
    <>
      <div onClick={() => setIsOpen(true)}>
        {children}
      </div>
      
      <EnhancedAIPreview
        leadId={lead.id}
        leadName={`${lead.firstName} ${lead.lastName}`}
        vehicleInterest={lead.vehicleInterest}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onAIEnabled={handleAIEnabled}
        autoGenerate={true}
      />
    </>
  );
};

export default AIPreviewPopout;
