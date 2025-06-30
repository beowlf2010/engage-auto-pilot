
import React, { useState } from 'react';
import { Lead } from '@/types/lead';
import EnhancedAIPreview from './EnhancedAIPreview';

interface AIPreviewPopoutProps {
  lead: Lead;
  onAIOptInChange: () => void;
  children: React.ReactNode;
}

const AIPreviewPopout: React.FC<AIPreviewPopoutProps> = ({
  lead,
  onAIOptInChange,
  children
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleAIEnabled = () => {
    console.log('🎯 [AI PREVIEW POPOUT] AI enabled for lead:', lead.id);
    setIsOpen(false); // Close the modal first
    onAIOptInChange(); // Then trigger the callback
  };

  const handleOpenModal = () => {
    console.log('📝 [AI PREVIEW POPOUT] Opening AI preview for lead:', lead.id);
    setIsOpen(true);
  };

  return (
    <>
      <div onClick={handleOpenModal} className="cursor-pointer">
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
