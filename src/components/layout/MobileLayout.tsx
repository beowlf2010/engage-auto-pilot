
import React, { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Menu, X } from 'lucide-react';
import { AppSidebar } from './AppSidebar';
import MobileBottomNav from './MobileBottomNav';
import { useAuth } from '@/components/auth/AuthProvider';
import { useUnreadCount } from '@/hooks/useUnreadCount';

interface MobileLayoutProps {
  children: React.ReactNode;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({ children }) => {
  const { profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const unreadCount = useUnreadCount();

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Mobile Header */}
        <header className="sticky top-0 z-40 bg-background border-b px-4 py-3 flex items-center justify-between">
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="p-2">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <div className="flex justify-end p-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSidebarOpen(false)}
                className="p-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {profile && (
              <div className="px-4">
                <h2 className="text-lg font-semibold mb-4">Navigation</h2>
                {/* Simplified navigation for mobile - avoiding sidebar provider issues */}
                <div className="space-y-2">
                  <a href="/dashboard" className="block p-2 rounded hover:bg-accent">Dashboard</a>
                  <a href="/smart-inbox" className="block p-2 rounded hover:bg-accent">
                    Smart Inbox {unreadCount > 0 && <span className="ml-2 bg-destructive text-destructive-foreground px-2 py-1 rounded text-xs">{unreadCount}</span>}
                  </a>
                  <a href="/leads" className="block p-2 rounded hover:bg-accent">Leads</a>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        <h1 className="text-lg font-semibold text-foreground">AutoVantage</h1>
        
        <div className="w-10" /> {/* Spacer for centering */}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav unreadCount={unreadCount} />
      </div>
    </TooltipProvider>
  );
};

export default MobileLayout;
