
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import EnhancedNavigation from '@/components/enhanced/EnhancedNavigation';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <EnhancedNavigation />
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
