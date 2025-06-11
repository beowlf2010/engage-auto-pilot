
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { useConversations } from "@/hooks/useConversations";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import LeadsList from "@/components/LeadsList";
import SmartInbox from "@/components/SmartInbox";
import UploadLeads from "@/components/UploadLeads";
import Settings from "@/components/Settings";

const Index = () => {
  const location = useLocation();
  const [activeView, setActiveView] = useState("dashboard");
  const { profile, loading } = useAuth();
  const { conversations } = useConversations();
  const unreadCount = useUnreadCount(conversations);

  // Update active view based on route
  useEffect(() => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') {
      setActiveView("dashboard");
    } else if (path === '/leads') {
      setActiveView("leads");
    } else if (path === '/inbox') {
      setActiveView("inbox");
    } else if (path === '/upload-leads') {
      setActiveView("upload");
    } else if (path === '/settings') {
      setActiveView("settings");
    }
  }, [location.pathname]);

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  const user = {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    firstName: profile.first_name,
    lastName: profile.last_name,
    phone: profile.phone
  };

  const renderContent = () => {
    switch (activeView) {
      case "dashboard":
        return <Dashboard user={user} onViewChange={setActiveView} />;
      case "leads":
        return <LeadsList user={user} />;
      case "inbox":
        return <SmartInbox user={user} />;
      case "upload":
        return <UploadLeads user={user} />;
      case "settings":
        return <Settings user={user} />;
      default:
        return <Dashboard user={user} onViewChange={setActiveView} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex">
      <Sidebar 
        user={user} 
        activeView={activeView} 
        onViewChange={setActiveView}
        unreadCount={unreadCount}
      />
      <main className="flex-1 overflow-hidden">
        <div className="h-full p-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default Index;
