
import React, { useState } from 'react';
import { TooltipProvider } from "@/components/ui/tooltip";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/components/auth/AuthProvider";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const { profile, loading } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  
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
          unreadCount={0}
        />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </TooltipProvider>
  );
};

export default AppLayout;
