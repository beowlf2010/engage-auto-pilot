
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import InventoryDashboard from '@/components/InventoryDashboard';

const InventoryDashboardPage = () => {
  console.log('InventoryDashboardPage rendering...');
  
  const { profile, loading, user } = useAuth();
  
  console.log('InventoryDashboardPage - Auth state:', { 
    profile: !!profile, 
    loading, 
    role: profile?.role,
    user: !!user,
    profileData: profile 
  });
  
  if (loading) {
    console.log('InventoryDashboardPage - Auth loading, showing spinner...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading authentication...</span>
      </div>
    );
  }
  
  if (!user) {
    console.log('InventoryDashboardPage - No user, redirecting to auth...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please sign in to access inventory dashboard</p>
        </div>
      </div>
    );
  }
  
  if (!profile) {
    console.log('InventoryDashboardPage - No profile, showing profile loading message...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading Profile</h2>
          <p className="text-gray-600">Please wait while we load your profile...</p>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mt-2"></div>
        </div>
      </div>
    );
  }

  console.log('InventoryDashboardPage - Rendering InventoryDashboard component...');
  console.log('InventoryDashboardPage - User has role:', profile.role);
  
  return (
    <div className="w-full">
      <div className="mb-4 p-2 bg-gray-100 text-xs text-gray-600 rounded">
        Debug: User {user.email} with role {profile.role} accessing inventory
      </div>
      <InventoryDashboard />
    </div>
  );
};

export default InventoryDashboardPage;
