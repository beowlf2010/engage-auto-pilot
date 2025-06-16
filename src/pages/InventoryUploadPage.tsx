
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import InventoryUpload from '@/components/InventoryUpload';

const InventoryUploadPage = () => {
  const { profile } = useAuth();
  
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

  return (
    <div className="container mx-auto py-6">
      <InventoryUpload user={{ id: profile.id, role: profile.role }} />
    </div>
  );
};

export default InventoryUploadPage;
