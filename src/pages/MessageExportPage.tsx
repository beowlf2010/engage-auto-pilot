
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import MessageExportImport from '@/components/messaging/MessageExportImport';
import ErrorBoundary from '@/components/ErrorBoundary';

const MessageExportPage = () => {
  const { profile } = useAuth();
  
  if (!profile || !['manager', 'admin'].includes(profile.role)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
        <div className="container mx-auto py-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-800 mb-4">Access Denied</h1>
            <p className="text-slate-600">Manager or Admin role required to access message export/import.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
        <div className="container mx-auto py-6">
          <MessageExportImport />
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default MessageExportPage;
