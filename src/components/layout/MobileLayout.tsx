import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, X } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import MobileBottomNav from './MobileBottomNav';
import { useAuth } from '@/components/auth/AuthProvider';
import { useUnreadCount } from '@/hooks/useUnreadCount';

const MobileLayout = () => {
  const { profile } = useAuth();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const unreadCount = 0; // Simplified for now

  if (!isMobile) {
    return null; // Use regular layout for desktop
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 bg-background border-b px-4 py-3 flex items-center justify-between">
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
              <Sidebar
                user={{
                  id: profile.id,
                  email: profile.email || '',
                  role: profile.role,
                  firstName: profile.first_name || 'User',
                  lastName: profile.last_name || ''
                }}
                activeView=""
                onViewChange={() => setSidebarOpen(false)}
                unreadCount={unreadCount}
              />
            )}
          </SheetContent>
        </Sheet>

        <h1 className="text-lg font-semibold text-foreground">AutoVantage</h1>
        
        <div className="w-10" /> {/* Spacer for centering */}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav unreadCount={unreadCount} />
    </div>
  );
};

export default MobileLayout;