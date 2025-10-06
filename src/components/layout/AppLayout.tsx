
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useGlobalUnreadCount } from '@/hooks/useGlobalUnreadCount';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { profile } = useAuth();
  const { unreadCount } = useGlobalUnreadCount();

  // Desktop layout with modern sidebar and mesh gradient background
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background relative overflow-hidden">
        {/* Animated mesh gradient background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-primary-glow/5 -z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-accent/5 via-transparent to-transparent -z-10" />
        
        <div className="flex flex-1 w-full">
          {profile && <AppSidebar unreadCount={unreadCount} />}
          
          <div className="flex-1 flex flex-col">
            <header className="h-12 flex items-center border-b border-border/50 bg-background/80 backdrop-blur-xl px-4 shadow-[var(--shadow-card)]">
              <SidebarTrigger className="mr-4 hover:scale-110 transition-transform duration-200" />
              <div className="flex-1" />
              <ThemeToggle />
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
