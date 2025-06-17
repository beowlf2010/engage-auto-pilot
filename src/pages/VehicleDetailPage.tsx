
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import VehicleDetail from '@/components/VehicleDetail';

const VehicleDetailPage = () => {
  const { profile } = useAuth();
  
  if (!profile) {
    return <div>Please sign in to access vehicle details</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <VehicleDetail />
    </div>
  );
};

export default VehicleDetailPage;
