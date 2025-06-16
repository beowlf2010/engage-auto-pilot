
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import RPOInsights from '@/components/RPOInsights';

const RPOInsightsPage = () => {
  const { profile } = useAuth();
  
  if (!profile || !['manager', 'admin'].includes(profile.role)) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Access Denied</h1>
          <p className="text-slate-600">Manager or Admin role required to access RPO insights.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <RPOInsights />
    </div>
  );
};

export default RPOInsightsPage;
