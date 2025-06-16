
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import InventoryDashboard from '@/components/InventoryDashboard';

const InventoryDashboardPage = () => {
  console.log('InventoryDashboardPage rendering...');
  
  const { profile, loading } = useAuth();
  
  console.log('InventoryDashboardPage - Auth state:', { profile: !!profile, loading, role: profile?.role });
  
  if (loading) {
    console.log('InventoryDashboardPage - Auth loading, showing spinner...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading...</span>
      </div>
    );
  }
  
  if (!profile) {
    console.log('InventoryDashboardPage - No profile, showing sign-in message...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please sign in to access inventory dashboard</p>
        </div>
      </div>
    );
  }

  console.log('InventoryDashboardPage - Rendering InventoryDashboard component...');
  return (
    <div className="w-full">
      <InventoryDashboard />
    </div>
  );
};

export default InventoryDashboardPage;
