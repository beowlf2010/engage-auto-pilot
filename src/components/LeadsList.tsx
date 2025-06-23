
import React, { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import LeadsPageHeader from './leads/LeadsPageHeader';
import ProcessManagementPanel from './leads/ProcessManagementPanel';
import MultiFileLeadUploadModal from './leads/MultiFileLeadUploadModal';
import VINImportModal from './leads/VINImportModal';

const LeadsList = () => {
  const { profile } = useAuth();
  const [isVINImportModalOpen, setIsVINImportModalOpen] = useState(false);
  const [showFreshLeadsOnly, setShowFreshLeadsOnly] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [isMultiFileModalOpen, setIsMultiFileModalOpen] = useState(false);

  const canImport = profile?.role === 'manager' || profile?.role === 'admin';

  const handleFreshLeadsClick = () => {
    setShowFreshLeadsOnly(!showFreshLeadsOnly);
  };

  const handleProcessAssigned = () => {
    setSelectedLeads([]);
  };

  return (
    <div className="space-y-6">
      <LeadsPageHeader 
        canImport={canImport}
        onVINImportClick={() => setIsVINImportModalOpen(true)}
        onFreshLeadsClick={handleFreshLeadsClick}
      />
      
      {/* Process Management Panel - only show when leads are selected */}
      {selectedLeads.length > 0 && (
        <ProcessManagementPanel 
          selectedLeadIds={selectedLeads}
          onProcessAssigned={handleProcessAssigned}
        />
      )}

      <MultiFileLeadUploadModal
        isOpen={isMultiFileModalOpen}
        onClose={() => setIsMultiFileModalOpen(false)}
        onUploadComplete={() => {
          // Refresh would happen via the main leads hook
        }}
      />

      <VINImportModal
        isOpen={isVINImportModalOpen}
        onClose={() => setIsVINImportModalOpen(false)}
        onUploadComplete={() => {
          // Refresh would happen via the main leads hook
        }}
      />
    </div>
  );
};

export default LeadsList;
