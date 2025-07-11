
import React, { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import EnhancedInventoryUpload from '@/components/inventory-upload/EnhancedInventoryUpload';
import UploadSuccessNotification from '@/components/inventory/UploadSuccessNotification';

const InventoryUploadPage = () => {
  const { profile } = useAuth();
  const [showNotification, setShowNotification] = useState(false);
  
  if (!profile || !['manager', 'admin'].includes(profile.role)) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Access Denied</h1>
          <p className="text-slate-600">Manager or Admin role required to upload inventory.</p>
        </div>
      </div>
    );
  }

  const handleStartReUpload = () => {
    setShowNotification(false);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {showNotification && (
        <UploadSuccessNotification onReUpload={handleStartReUpload} />
      )}
      {!showNotification && (
        <EnhancedInventoryUpload userId={profile.id} />
      )}
    </div>
  );
};

export default InventoryUploadPage;
