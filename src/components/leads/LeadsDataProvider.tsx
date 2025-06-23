
import React, { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useLeads } from '@/hooks/useLeads';
import ProcessManagementPanel from './ProcessManagementPanel';
import MultiFileLeadUploadModal from './MultiFileLeadUploadModal';
import VINImportModal from './VINImportModal';

interface LeadsDataProviderProps {
  isVINImportModalOpen: boolean;
  setIsVINImportModalOpen: (open: boolean) => void;
  showFreshLeadsOnly: boolean;
  selectedLeads: string[];
  onProcessAssigned?: () => void;
}

const LeadsDataProvider = ({ 
  isVINImportModalOpen, 
  setIsVINImportModalOpen, 
  showFreshLeadsOnly,
  selectedLeads,
  onProcessAssigned
}: LeadsDataProviderProps) => {
  const { profile } = useAuth();
  const [isMultiFileModalOpen, setIsMultiFileModalOpen] = useState(false);
  
  const { leads, loading, error, refetch } = useLeads();

  return (
    <div className="space-y-6">
      {/* Process Management Panel */}
      <ProcessManagementPanel 
        selectedLeadIds={selectedLeads}
        onProcessAssigned={() => {
          if (refetch) refetch();
          if (onProcessAssigned) onProcessAssigned();
        }}
      />

      <MultiFileLeadUploadModal
        isOpen={isMultiFileModalOpen}
        onClose={() => setIsMultiFileModalOpen(false)}
        onUploadComplete={refetch}
      />

      <VINImportModal
        isOpen={isVINImportModalOpen}
        onClose={() => setIsVINImportModalOpen(false)}
        onUploadComplete={refetch}
      />
    </div>
  );
};

export default LeadsDataProvider;
