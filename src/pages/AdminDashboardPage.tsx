
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { ManagerDashboard } from '@/components/StreamlinedDashboards';

const AdminDashboardPage = () => {
  const { profile } = useAuth();
  
  if (!profile || profile.role !== 'admin') {
    return <div>Access denied. Admin role required.</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Admin Dashboard</h1>
        <p className="text-slate-600">Complete system overview</p>
      </div>
      <ManagerDashboard />
    </div>
  );
};

export default AdminDashboardPage;
