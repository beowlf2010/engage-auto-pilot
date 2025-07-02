
import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { TooltipProvider } from "@/components/ui/tooltip";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/components/auth/AuthProvider";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const { profile, loading } = useAuth();
  const location = useLocation();
  
  // Determine active view based on current route
  const getActiveViewFromPath = (pathname: string) => {
    if (pathname.startsWith('/dashboard')) return 'dashboard';
    if (pathname.startsWith('/leads')) return 'leads';
    if (pathname.startsWith('/smart-inbox')) return 'inbox';
    if (pathname.startsWith('/inventory-dashboard')) return 'inventory-dashboard';
    if (pathname.startsWith('/upload-inventory')) return 'upload-inventory';
    if (pathname.startsWith('/rpo-insights')) return 'rpo-insights';
    if (pathname.startsWith('/rpo-database')) return 'rpo-database';
    if (pathname.startsWith('/financial-dashboard')) return 'financial-dashboard';
    if (pathname.startsWith('/ai-monitor')) return 'ai-monitor';
    if (pathname.startsWith('/sales-dashboard')) return 'sales-dashboard';
    if (pathname.startsWith('/analytics')) return 'analytics';
    if (pathname.startsWith('/predictive-analytics')) return 'predictive-analytics';
    if (pathname.startsWith('/message-export')) return 'message-export';
    if (pathname.startsWith('/personalization')) return 'personalization';
    if (pathname.startsWith('/admin-dashboard')) return 'admin-dashboard';
    if (pathname.startsWith('/manager-dashboard')) return 'manager-dashboard';
    if (pathname.startsWith('/settings')) return 'settings';
    return 'dashboard'; // default fallback
  };

  const [activeView, setActiveView] = useState(getActiveViewFromPath(location.pathname));
  
  // Update active view when location changes
  React.useEffect(() => {
    setActiveView(getActiveViewFromPath(location.pathname));
  }, [location.pathname]);
  
  // Show loading or handle case where profile is not loaded yet
  if (loading || !profile) {
    return (
      <TooltipProvider>
        <div className="flex h-screen bg-gray-50 items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // Create user object from profile data
  const user = {
    id: profile.id,
    email: profile.email || '',
    role: profile.role || 'salesperson',
    firstName: profile.first_name || '',
    lastName: profile.last_name || ''
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-gray-50">
        <Sidebar 
          user={user}
          activeView={activeView}
          onViewChange={setActiveView}
          unreadCount={0} // TODO: Implement real unread count
        />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </TooltipProvider>
  );
};

export default AppLayout;
