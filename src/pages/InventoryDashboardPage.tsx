
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import InventoryDashboard from '@/components/InventoryDashboard';

const InventoryDashboardPage = () => {
  const { profile } = useAuth();
  
  if (!profile) {
    return <div>Please sign in to access inventory</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <InventoryDashboard />
    </div>
  );
};

export default InventoryDashboardPage;
