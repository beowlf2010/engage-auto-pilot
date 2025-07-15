
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { EmergencyStopHeader } from '@/components/emergency/EmergencyStopHeader';
import { aiEmergencyService } from '@/services/aiEmergencyService';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { profile } = useAuth();
  const unreadCount = useUnreadCount();
  const [isEmergencyActive, setIsEmergencyActive] = React.useState(false);

  React.useEffect(() => {
    const checkEmergencyState = async () => {
      await aiEmergencyService.initialize();
      setIsEmergencyActive(aiEmergencyService.isAIDisabled());
    };

    checkEmergencyState();

    const unsubscribe = aiEmergencyService.onStatusChange((disabled) => {
      setIsEmergencyActive(disabled);
    });

    return unsubscribe;
  }, []);

  // Desktop layout with modern sidebar
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <EmergencyStopHeader />
        <div className={`flex flex-1 w-full ${isEmergencyActive ? 'pt-12' : ''}`}>
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
