
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { ManagerDashboard } from '@/components/StreamlinedDashboards';

const ManagerDashboardPage = () => {
  const { profile } = useAuth();
  
  if (!profile || !['manager', 'admin'].includes(profile.role)) {
    return <div>Access denied. Manager or Admin role required.</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Manager Dashboard</h1>
        <p className="text-slate-600">Team performance overview</p>
      </div>
      <ManagerDashboard />
    </div>
  );
};

export default ManagerDashboardPage;
