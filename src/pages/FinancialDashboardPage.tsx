
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import FinancialDashboard from '@/components/financial/FinancialDashboard';

const FinancialDashboardPage = () => {
  const { profile } = useAuth();
  
  if (!profile || !['manager', 'admin'].includes(profile.role)) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Access Denied</h1>
          <p className="text-slate-600">Manager or Admin role required to access financial data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <FinancialDashboard 
        user={{
          id: profile.id,
          email: profile.email || '',
          role: profile.role,
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          phone: profile.phone || undefined
        }}
      />
    </div>
  );
};

export default FinancialDashboardPage;
