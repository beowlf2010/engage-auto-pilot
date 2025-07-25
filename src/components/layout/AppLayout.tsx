
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useGlobalUnreadCount } from '@/hooks/useGlobalUnreadCount';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { profile } = useAuth();
  const { unreadCount } = useGlobalUnreadCount();

  // Desktop layout with modern sidebar
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <div className="flex flex-1 w-full">
          {profile && <AppSidebar unreadCount={unreadCount} />}
          
          <div className="flex-1 flex flex-col">
            <header className="h-12 flex items-center border-b border-border bg-background px-4">
              <SidebarTrigger className="mr-4" />
              <div className="flex-1" />
            </header>
            
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
