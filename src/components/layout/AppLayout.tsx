import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/components/auth/AuthProvider';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import Sidebar from '@/components/Sidebar';
import MobileLayout from './MobileLayout';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { profile } = useAuth();
  const isMobile = useIsMobile();
  const unreadCount = 0; // Simplified for now

  if (isMobile) {
    return <MobileLayout />;
  }

  // Desktop layout
  return (
    <div className="min-h-screen bg-background flex">
      {profile && (
        <Sidebar
          user={{
            id: profile.id,
            email: profile.email || '',
            role: profile.role,
            firstName: profile.first_name || 'User',
            lastName: profile.last_name || ''
          }}
          activeView=""
          onViewChange={() => {}}
          unreadCount={unreadCount}
        />
      )}
      
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;