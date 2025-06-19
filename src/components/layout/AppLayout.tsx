
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import StreamlinedNavigation from '@/components/StreamlinedNavigation';
import Breadcrumb from './Breadcrumb';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { profile } = useAuth();

  if (!profile) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <StreamlinedNavigation />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6">
          <Breadcrumb />
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
