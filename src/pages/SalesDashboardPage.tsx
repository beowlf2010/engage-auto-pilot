
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { SalesDashboard } from '@/components/StreamlinedDashboards';

const SalesDashboardPage = () => {
  const { profile } = useAuth();
  
  if (!profile || profile.role !== 'sales') {
    return <div>Access denied. Sales role required.</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Sales Dashboard</h1>
        <p className="text-slate-600">Your personal performance metrics</p>
      </div>
      <SalesDashboard />
    </div>
  );
};

export default SalesDashboardPage;
