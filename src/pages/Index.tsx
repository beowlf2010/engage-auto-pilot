
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { useConversations } from "@/hooks/useConversations";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import EnhancedDashboard from "@/components/enhanced/EnhancedDashboard";
import LeadsList from "@/components/LeadsList";
import SmartInbox from "@/components/SmartInbox";
import UploadLeads from "@/components/UploadLeads";
import Settings from "@/components/Settings";
import FinancialDashboard from "@/components/financial/FinancialDashboard";

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
    } else if (path === '/financial-dashboard') {
      setActiveView("financial-dashboard");
    }
  }, [location.pathname]);

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">Loading your dashboard...</p>
          <p className="text-sm text-gray-500 mt-2">Preparing everything for you</p>
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
        return <EnhancedDashboard user={user} />;
      case "leads":
        return <LeadsList />;
      case "inbox":
        return <SmartInbox user={user} />;
      case "upload":
        return <UploadLeads user={user} />;
      case "settings":
        return <Settings user={user} />;
      case "financial-dashboard":
        return <FinancialDashboard user={user} />;
      default:
        return <EnhancedDashboard user={user} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <main className="flex-1">
        {renderContent()}
      </main>
    </div>
  );
};

export default Index;
