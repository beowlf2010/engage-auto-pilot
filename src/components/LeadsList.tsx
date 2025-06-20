
import React, { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import LeadsPageHeader from './leads/LeadsPageHeader';
import LeadsDataProvider from './leads/LeadsDataProvider';

const LeadsList = () => {
  const { profile } = useAuth();
  const [isVINImportModalOpen, setIsVINImportModalOpen] = useState(false);
  const [showFreshLeadsOnly, setShowFreshLeadsOnly] = useState(false);

  const canImport = profile?.role === 'manager' || profile?.role === 'admin';

  const handleFreshLeadsClick = () => {
    setShowFreshLeadsOnly(!showFreshLeadsOnly);
  };

  return (
    <div className="space-y-6">
      <LeadsPageHeader 
        canImport={canImport}
        onVINImportClick={() => setIsVINImportModalOpen(true)}
        onFreshLeadsClick={handleFreshLeadsClick}
      />
      
      <LeadsDataProvider
        isVINImportModalOpen={isVINImportModalOpen}
        setIsVINImportModalOpen={setIsVINImportModalOpen}
        showFreshLeadsOnly={showFreshLeadsOnly}
      />
    </div>
  );
};

export default LeadsList;
