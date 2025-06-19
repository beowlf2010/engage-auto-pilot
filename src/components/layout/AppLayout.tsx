
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import Sidebar from '@/components/Sidebar';
import Breadcrumb from './Breadcrumb';
import { useGlobalUnreadCount } from '@/hooks/useGlobalUnreadCount';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { profile } = useAuth();
  const { unreadCount } = useGlobalUnreadCount();

  if (!profile) {
    return <>{children}</>;
  }

  const user = {
    id: profile.id,
    email: profile.email || '',
    role: profile.role,
    firstName: profile.first_name || '',
    lastName: profile.last_name || ''
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar 
        user={user}
        activeView=""
        onViewChange={() => {}}
        unreadCount={unreadCount}
      />
      <div className="flex-1 flex flex-col">
        <main className="flex-1">
          <div className="container mx-auto px-6 py-6">
            <Breadcrumb />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
