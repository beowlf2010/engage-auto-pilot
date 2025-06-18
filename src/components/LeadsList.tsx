
import React, { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import LeadsPageHeader from './leads/LeadsPageHeader';
import LeadsDataProvider from './leads/LeadsDataProvider';

const LeadsList = () => {
  const { profile } = useAuth();
  const [isVINImportModalOpen, setIsVINImportModalOpen] = useState(false);

  const canImport = profile?.role === 'manager' || profile?.role === 'admin';

  return (
    <div className="space-y-6">
      <LeadsPageHeader 
        canImport={canImport}
        onVINImportClick={() => setIsVINImportModalOpen(true)}
      />
      
      <LeadsDataProvider
        isVINImportModalOpen={isVINImportModalOpen}
        setIsVINImportModalOpen={setIsVINImportModalOpen}
      />
    </div>
  );
};

export default LeadsList;
