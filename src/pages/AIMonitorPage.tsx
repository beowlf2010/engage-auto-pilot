
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import AIMessageMonitor from '@/components/AIMessageMonitor';

const AIMonitorPage = () => {
  const { profile } = useAuth();
  
  if (!profile || !['manager', 'admin'].includes(profile.role)) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Access Denied</h1>
          <p className="text-slate-600">Manager or Admin role required to access AI monitoring.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">AI Message Monitor</h1>
        <p className="text-slate-600">Monitor and control your AI messaging system</p>
      </div>
      <AIMessageMonitor />
    </div>
  );
};

export default AIMonitorPage;
